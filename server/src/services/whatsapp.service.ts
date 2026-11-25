import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { departments, districts, levels } from "../data/catalog.js";
import { store } from "../data/store.js";
import { HttpError } from "../lib/httpError.js";
import { aiEnabled } from "../lib/llm.js";
import type { CitizenSession, Grievance, TimelineEntry, WhatsAppMessage } from "../types.js";
import { assistant, draft, translate, type LangCode } from "./ai.service.js";
import * as grievances from "./grievance.service.js";
import { getLang, readsHindi, setLang, type ChatLang } from "./prefs.service.js";
import { triage } from "./triage.service.js";
import { detectPahari, garhwaliEnabled, transcribeGarhwaliFile } from "../voice/garhwali.js";
import { transcribeFile } from "../voice/sarvam.js";
import { duplicateMessage, findDuplicate, joinDuplicate } from "./duplicate.service.js";

/*
 * WhatsApp channel for CM Helpline.
 * - Every update on a complaint (registered, officer note, escalation, resolution with photo, reminder,
 *   reopening, neighbours joining) is sent to the citizen on WhatsApp.
 * - Citizens can reply: ask for status, send a reminder, rate, reopen, or describe a new problem.
 *   AI writes the complaint formally, routes it, and registers it after the citizen says YES.
 * Without a WhatsApp Business account the messages are kept and shown in the demo phone ("simulated").
 */

const cloudEnabled = () => Boolean(config.whatsapp.token && config.whatsapp.phoneId);

/** WhatsApp on an ordinary number (services/walink.service.ts) registers itself here once linked. */
type LinkedSender = { ready: () => boolean; send: (mobile: string, text: string, image?: Buffer) => Promise<void> };
let linked: LinkedSender | undefined;
export const useLinkedSender = (s: LinkedSender) => void (linked = s);
const linkedReady = () => Boolean(linked?.ready());

export const whatsappStatus = () => ({ mode: linkedReady() ? "linked" : cloudEnabled() ? "cloud" : "simulated", ai: aiEnabled() });

/** Photos are kept as data URLs; the linked number sends the bytes. */
const imageBytes = (dataUrl?: string) => (dataUrl?.startsWith("data:") ? Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64") : undefined);

const deptName = (id: string, hi: boolean) => {
  const d = departments.find((x) => x.id === id);
  return d ? (hi ? d.name.hi : d.name.en) : id;
};
const fmtDate = (iso: string, hi: boolean) =>
  new Date(iso).toLocaleDateString(hi ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

async function deliver(m: WhatsAppMessage) {
  if (linkedReady()) {
    try {
      await linked!.send(m.mobile, m.text, imageBytes(m.image));
      m.status = "sent";
    } catch (err) {
      m.status = "failed";
      console.warn("WhatsApp (linked number) send failed", err instanceof Error ? err.message : err);
    }
    return;
  }
  if (!cloudEnabled()) return;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${config.whatsapp.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.whatsapp.token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: `91${m.mobile}`, type: "text", text: { body: m.text, preview_url: false } }),
      signal: AbortSignal.timeout(15_000),
    });
    m.status = res.ok ? "sent" : "failed";
    if (!res.ok) console.warn("WhatsApp send failed", res.status, await res.text().catch(() => ""));
  } catch (err) {
    m.status = "failed";
    console.warn("WhatsApp send failed", err);
  }
}

export function send(mobile: string, text: string, extra: { grievanceId?: string; image?: string } = {}) {
  const m: WhatsAppMessage = { id: randomUUID(), mobile, dir: "out", text, at: new Date().toISOString(), status: linkedReady() || cloudEnabled() ? "sent" : "simulated", ...extra };
  store.whatsapp.insert(m);
  void deliver(m);
  return m;
}

/* ------------------------------------------------------------------ */
/* Updates on every change                                             */
/* ------------------------------------------------------------------ */

function compose(g: Grievance, e: TimelineEntry, hi: boolean): { text: string; image?: string; toSupporters?: boolean } | null {
  const lvl = levels[(e.level ?? g.level) as 1 | 2 | 3 | 4];
  const officer = hi ? lvl.title.hi : lvl.title.en;
  const due = fmtDate(g.levelDueAt, hi);
  switch (e.event) {
    case "assigned":
      return {
        text: hi
          ? `🙏 नमस्ते ${g.citizenName}। आपकी शिकायत *${g.id}* मुख्यमंत्री हेल्पलाइन पर दर्ज हो गई है।\n\n📌 ${g.subject}\n🏢 ${deptName(g.departmentId, true)} · ${officer} (L1)\n⏳ कार्यवाही की समय सीमा: ${due}${g.photos?.before ? "" : "\n\n📷 समस्या की फ़ोटो हो तो यहीं भेज दें, वह इस शिकायत में जुड़ जाएगी और अधिकारी को दिखेगी।"}${g.location ? "" : `\n\n📍 समस्या की सही जगह नक्शे पर बताएँ: ${grievances.pinUrl(g)}\n(या यहीं 📎 → लोकेशन भेजें)`}\n\nहर अद्यतन यहीं मिलेगा। स्थिति जानने हेतु *STATUS* लिखें।`
          : `🙏 Namaste ${g.citizenName}. Your complaint *${g.id}* is registered with CM Helpline.\n\n📌 ${g.subject}\n🏢 ${deptName(g.departmentId, false)} · ${officer} (L1)\n⏳ Action due by ${due}${g.photos?.before ? "" : "\n\n📷 Have a photo of the problem? Send it here; it will be added to this complaint for the officer."}${g.location ? "" : `\n\n📍 Mark the exact spot on the map: ${grievances.pinUrl(g)}\n(or share your location here: 📎 → Location)`}\n\nYou'll get every update here. Reply *STATUS* any time.`,
      };
    case "note":
      return { toSupporters: true, text: hi ? `📝 *${g.id}* पर अद्यतन\n${e.by}: “${e.note}”` : `📝 Update on *${g.id}*\n${e.by}: “${e.note}”` };
    case "escalated":
      return {
        toSupporters: true,
        text: hi
          ? `⬆️ *${g.id}* का समय पर निस्तारण नहीं हुआ, इसलिए यह स्वतः ${officer} (L${e.level}) को भेजी गई है। नई समय सीमा: ${due}।`
          : `⬆️ *${g.id}* was not resolved in time, so it has moved automatically to the ${officer} (L${e.level}). New deadline: ${due}.`,
      };
    case "resolved":
      return {
        toSupporters: true,
        image: g.photos?.after?.dataUrl,
        text: hi
          ? `✅ *${g.id}* निस्तारित: “${e.note}”\nफ़ोटो प्रमाण संलग्न है।\n\nसमाधान से कितने संतुष्ट हैं? *1* से *5* लिखें। समस्या बनी है तो *REOPEN* लिखें।`
          : `✅ *${g.id}* is resolved: “${e.note}”\nPhoto proof attached.\n\nHow satisfied are you? Reply *1* to *5*. If the problem remains, reply *REOPEN*.`,
      };
    case "reminder":
      return { text: hi ? `🔔 *${g.id}* हेतु आपका अनुस्मारक ${officer} को भेज दिया गया है। यह मुख्यमंत्री कार्यालय को भी दिखता है।` : `🔔 Your reminder for *${g.id}* has gone to the ${officer}. The CM Office can see it too.` };
    case "reopened":
      return { text: hi ? `🔁 *${g.id}* पुनः खोली गई और ${officer} (L${e.level}) को भेजी गई। समय सीमा: ${due}।` : `🔁 *${g.id}* is reopened and sent to the ${officer} (L${e.level}). Deadline: ${due}.` };
    case "closed":
      return { text: hi ? `🙏 रेटिंग के लिए धन्यवाद। *${g.id}* बंद की गई।` : `🙏 Thank you for rating. *${g.id}* is now closed.` };
    case "supported":
      return { text: hi ? `👥 ${e.note ?? ""} — आपकी शिकायत *${g.id}* से जुड़े।` : `👥 ${e.note ?? ""} — they joined your complaint *${g.id}*.` };
    default:
      return null;
  }
}

async function localise(text: string, lang?: string) {
  if (!lang || lang === "en" || lang === "hi" || !aiEnabled()) return text;
  try {
    return (await translate([text], lang as LangCode))[0];
  } catch {
    return text;
  }
}

/** Sends any timeline entries the citizen has not yet been told about. */
function onGrievanceChange(g: Grievance) {
  const from = g.notifiedUpTo ?? g.timeline.length;
  if (from >= g.timeline.length) return;
  const entries = g.timeline.slice(from);
  g.notifiedUpTo = g.timeline.length;
  if (g.whatsapp === false) return;
  const hi = g.lang === "hi" || ["gbm", "kfy", "jns"].includes(g.lang ?? "");
  void (async () => {
    for (const e of entries) {
      const msg = compose(g, e, hi);
      if (!msg) continue;
      const text = await localise(msg.text, hi ? "hi" : g.lang);
      send(g.citizenMobile, text, { grievanceId: g.id, image: msg.image });
      if (msg.toSupporters) for (const m of g.supporters ?? []) send(m, text, { grievanceId: g.id, image: msg.image });
    }
  })();
}

store.onChange(onGrievanceChange);

/* ------------------------------------------------------------------ */
/* Replies from citizens                                               */
/* ------------------------------------------------------------------ */

type Pending = { description: string; formal?: { subject: string; description: string }; departmentId: string; categoryId: string; urgency: "normal" | "high"; districtId?: string; hi: boolean; stage: "district" | "confirm"; photo?: string; location?: { lat: number; lng: number } };
const conversations = new Map<string, { pending?: Pending; history: { from: "me" | "bot"; text: string }[]; photo?: string; location?: { lat: number; lng: number }; askLang?: boolean }>();

const isHindi = (s: string) => /[ऀ-ॿ]/.test(s);
// \b only knows English letters, so the end of a word is spelled out to work for Hindi too.
const END = String.raw`(?=$|[\s.,!?।🙏👍]|जी)`;
const YES = new RegExp(String.raw`^(yes|y|haan|ha|han|ji|ok|okay|हाँ|हां|हा|जी|ठीक|सही)${END}`, "iu");
const NO = new RegExp(String.raw`^(no|n|nahi|nahin|cancel|नहीं|नही|ना|रद्द)${END}`, "iu");

function findDistrict(text: string) {
  const t = text.toLowerCase();
  const aliases: Record<string, string[]> = { usnagar: ["udham singh nagar", "us nagar", "rudrapur", "kashipur"], pauri: ["pauri", "khirsu", "srinagar", "kotdwar"], tehri: ["tehri", "new tehri"], dehradun: ["dehradun", "doon", "rishikesh", "mussoorie"], nainital: ["nainital", "haldwani"], haridwar: ["haridwar", "roorkee"] };
  return districts.find((d) => t.includes(d.name.en.toLowerCase().split(" ")[0]) || text.includes(d.name.hi.split(" ")[0]) || aliases[d.id]?.some((a) => t.includes(a)))?.id;
}

function statusLines(mobile: string, hi: boolean) {
  const mine = store.grievances
    .all()
    .filter((g) => g.citizenMobile === mobile || g.supporters?.includes(mobile))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 3);
  if (!mine.length) return hi ? "इस नंबर से कोई शिकायत नहीं मिली। अपनी समस्या लिखकर भेजें, मैं दर्ज करने में मदद करूँगी।" : "No complaints found for this number. Describe your problem and I'll help you register it.";
  return mine
    .map((g) => {
      const open = g.status !== "resolved" && g.status !== "closed";
      const lvl = levels[g.level];
      return open
        ? hi
          ? `• *${g.id}* — ${g.subject}\n  ${lvl.title.hi} (L${g.level}) के पास, समय सीमा ${fmtDate(g.levelDueAt, true)}`
          : `• *${g.id}* — ${g.subject}\n  With the ${lvl.title.en} (L${g.level}), due ${fmtDate(g.levelDueAt, false)}`
        : hi
          ? `• *${g.id}* — ${g.subject}\n  ✅ निस्तारित ${g.resolvedAt ? fmtDate(g.resolvedAt, true) : ""}`
          : `• *${g.id}* — ${g.subject}\n  ✅ Resolved ${g.resolvedAt ? fmtDate(g.resolvedAt, false) : ""}`;
    })
    .join("\n\n");
}

const menu = (hi: boolean) =>
  hi
    ? "नमस्ते! मैं सहायक हूँ, मुख्यमंत्री हेल्पलाइन की ओर से। 🙏\n\n• अपनी समस्या लिखें या 🎤 बोलकर भेजें — मैं उसे दर्ज कराऊँगी\n• 📷 फ़ोटो भी भेज सकते हैं\n• *STATUS* — अपनी शिकायतों की स्थिति\n• *REMIND* — अधिकारी को अनुस्मारक\n• *भाषा* — भाषा बदलें (हिंदी / English / गढ़वळि / कुमाऊँनी)\n• आपात स्थिति: 112"
    : "Namaste! I'm Sahayak from CM Helpline. 🙏\n\n• Type your problem or send a 🎤 voice note — I'll register it\n• 📷 You can send photos too\n• *STATUS* — your complaints\n• *REMIND* — remind the officer\n• *LANGUAGE* — change language (Hindi / English / Garhwali / Kumaoni)\n• Emergency: 112";

const LANG_MENU = "🌐 भाषा चुनें / Choose your language:\n\n1️⃣ हिंदी\n2️⃣ English\n3️⃣ गढ़वळि (Garhwali)\n4️⃣ कुमाऊँनी (Kumaoni)\n\nनंबर लिखकर भेजें / Reply with the number.";
const LANG_SET: Record<ChatLang, string> = {
  hi: "✅ ठीक है, अब मैं हिंदी में बात करूँगी। शिकायतों के अपडेट भी हिंदी में आएँगे।\nभाषा बदलने हेतु कभी भी *भाषा* लिखें।",
  en: "✅ Done. I'll chat in English from now on, and complaint updates will come in English too.\nSend *LANGUAGE* any time to change it.",
  gbm: "✅ ठीक है, आप गढ़वळि में लिखें या बोलकर भेजें। मैं समझूँगी और गढ़वळि में जवाब देने की कोशिश करूँगी। शिकायत के अपडेट हिंदी में आएँगे।\nभाषा बदलने हेतु *भाषा* लिखें।",
  kfy: "✅ ठीक है, आप कुमाऊँनी में लिखें या बोलकर भेजें। मैं समझूँगी और कुमाऊँनी में जवाब देने की कोशिश करूँगी। शिकायत के अपडेट हिंदी में आएँगे।\nभाषा बदलने हेतु *भाषा* लिखें।",
};

/** A message that picks a language: a number from the language menu, or just a language's name. */
function languageChoice(text: string, menuOpen: boolean): ChatLang | null {
  const t = text.trim().toLowerCase().replace(/[.,।!?*]/g, "").replace(/[1-4]\ufe0f?\u20e3/, (d) => d[0]).trim();
  if (menuOpen && /^[1-4]$/.test(t)) return (["hi", "en", "gbm", "kfy"] as const)[Number(t) - 1];
  if (/^(hindi|हिंदी|हिन्दी)$/.test(t)) return "hi";
  if (/^(english|इंग्लिश|अंग्रेज़ी|अंग्रेजी)$/.test(t)) return "en";
  if (/^(garhwali|गढ़वाली|गढ़वळि)$/.test(t)) return "gbm";
  if (/^(kumaoni|kumauni|कुमाऊँनी|कुमाऊंनी)$/.test(t)) return "kfy";
  return null;
}

async function reply(mobile: string, text: string) {
  const conv = conversations.get(mobile)!;
  conv.history.push({ from: "bot", text });
  conv.history.splice(0, Math.max(0, conv.history.length - 10));
  send(mobile, text);
}

function errorText(err: unknown, hi: boolean) {
  if (err instanceof HttpError) return err.message;
  return hi ? "अभी यह नहीं हो सका। कृपया फिर प्रयास करें या 080 4729 1964 पर कॉल करें।" : "That didn't work right now. Please try again, or call 080 4729 1964.";
}

/**
 * A location shared on WhatsApp (📎 → Location): the exact spot of the problem. While a complaint is being drafted
 * it goes with it; otherwise it is added to the citizen's latest open complaint, or kept for the next one.
 */
export async function handleInboundLocation(mobile: string, lat: number, lng: number) {
  const conv = conversations.get(mobile) ?? { history: [] };
  conversations.set(mobile, conv);
  const pref = await getLang(mobile);
  const hi = pref ? readsHindi(pref) : conv.pending?.hi ?? true;
  store.whatsapp.insert({ id: randomUUID(), mobile, dir: "in", text: `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`, at: new Date().toISOString(), status: "received" });
  if (!grievances.inUttarakhand(lat, lng)) {
    return reply(mobile, hi ? "📍 यह जगह उत्तराखंड से बाहर है। यह हेल्पलाइन केवल उत्तराखंड की समस्याओं के लिए है। समस्या वाली जगह की लोकेशन भेजें।" : "📍 That place is outside Uttarakhand. This helpline handles problems in Uttarakhand only. Please share the location of the problem.");
  }
  if (conv.pending) {
    conv.pending.location = { lat, lng };
    return reply(mobile, hi ? "📍 लोकेशन मिल गई, शिकायत के साथ जुड़ जाएगी।" : "📍 Got the location; it will go with the complaint.");
  }
  const since = Date.now() - 30 * 86_400_000;
  const g = store.grievances
    .all()
    .filter((x) => (x.citizenMobile === mobile || x.supporters?.includes(mobile)) && x.status !== "resolved" && x.status !== "closed" && new Date(x.submittedAt).getTime() > since)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  if (!g) {
    conv.location = { lat, lng };
    return reply(mobile, hi ? "📍 लोकेशन मिली। अब समस्या लिखकर या बोलकर बताइए, मैं शिकायत दर्ज करूँगी और यह जगह उसमें जोड़ दूँगी।" : "📍 Got the location. Now tell me the problem; I'll register it with this spot.");
  }
  try {
    grievances.setLocation(g.id, { mobile }, lat, lng, "whatsapp");
  } catch (err) {
    return reply(mobile, errorText(err, hi));
  }
  return reply(
    mobile,
    hi
      ? `📍 सही जगह शिकायत *${g.id}* में जोड़ दी गई है। ${levels[g.level].title.hi} इसे नक्शे पर देख सकेंगे।`
      : `📍 The exact spot is added to complaint *${g.id}*. The ${levels[g.level].title.en} can now see it on the map.`,
  );
}

/**
 * A photo from the citizen. While a complaint is being drafted it goes with it; otherwise it is added to
 * their latest open complaint from the last 15 days (e.g. one just registered on a phone call).
 */
export async function handleInboundPhoto(mobile: string, bytes: Buffer, mime: string, caption: string, profileName?: string) {
  const conv = conversations.get(mobile) ?? { history: [] };
  conversations.set(mobile, conv);
  const pref = await getLang(mobile);
  const hi = pref ? readsHindi(pref) : isHindi(caption) || (conv.pending?.hi ?? true);
  if (bytes.length > 3_000_000) return reply(mobile, hi ? "फ़ोटो बहुत बड़ी है। कृपया छोटी फ़ोटो भेजें।" : "That photo is too large. Please send a smaller one.");
  const dataUrl = `data:${/^image\/(jpeg|png|webp)$/.test(mime) ? mime : "image/jpeg"};base64,${bytes.toString("base64")}`;
  store.whatsapp.insert({ id: randomUUID(), mobile, dir: "in", text: caption || "📷", image: dataUrl, at: new Date().toISOString(), status: "received" });

  if (conv.pending) {
    conv.pending.photo = dataUrl;
    if (caption) return handleInbound(mobile, caption, profileName);
    return reply(mobile, conv.pending.hi ? "📷 फ़ोटो मिल गई, शिकायत के साथ जुड़ जाएगी।" : "📷 Got the photo; it will go with the complaint.");
  }
  const since = Date.now() - 15 * 86_400_000;
  const g = store.grievances
    .all()
    .filter((x) => (x.citizenMobile === mobile || x.supporters?.includes(mobile)) && x.status !== "resolved" && x.status !== "closed" && new Date(x.submittedAt).getTime() > since)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  if (!g) {
    if (caption.length >= 25) {
      // A photo with the problem written under it: start the complaint and keep the photo for it.
      conv.photo = dataUrl;
      return handleInbound(mobile, caption, profileName);
    }
    conv.photo = dataUrl;
    return reply(mobile, hi ? "📷 फ़ोटो मिली। अब समस्या लिखकर या बोलकर बताइए, मैं शिकायत दर्ज करूँगी और यह फ़ोटो उसमें जोड़ दूँगी।" : "📷 Got the photo. Now tell me the problem in a message or voice note; I'll register it with this photo.");
  }
  try {
    grievances.addCitizenPhoto(g.id, mobile, { dataUrl });
  } catch (err) {
    return reply(mobile, errorText(err, hi));
  }
  return reply(
    mobile,
    hi
      ? `📷 फ़ोटो शिकायत *${g.id}* में जोड़ दी गई है। ${levels[g.level].title.hi} इसे देख सकेंगे।\nस्थिति जानने हेतु *STATUS* लिखें।`
      : `📷 Photo added to complaint *${g.id}*. The ${levels[g.level].title.en} can now see it.\nReply *STATUS* any time.`,
  );
}

/**
 * A voice note: Sarvam transcribes it; Garhwali or Kumaoni (chosen, or spotted in Sarvam's words) also goes
 * through the local model, whose words lead. The citizen sees what was heard, then gets the usual reply.
 */
export async function handleVoiceNote(mobile: string, audio: Buffer, mime: string, profileName?: string) {
  const pref = await getLang(mobile);
  const heard = await transcribeFile(audio, mime).catch((err: Error) => (console.warn(`[whatsapp] voice note: ${err.message}`), null));
  const sarvam = heard?.text ?? "";
  const pahari = pref === "gbm" || pref === "kfy" ? pref : sarvam ? detectPahari(sarvam) : null;
  const local = pahari && garhwaliEnabled() ? await transcribeGarhwaliFile(audio, mime) : null;
  const shown = local || sarvam;
  const hi = pref ? readsHindi(pref) : !sarvam || isHindi(sarvam);
  if (!shown) {
    return send(mobile, hi ? "माफ़ कीजिए, आवाज़ समझ नहीं आई। कृपया दोबारा बोलें या लिखकर भेजें।" : "Sorry, I couldn't make out the voice note. Please try again or type it.");
  }
  send(mobile, hi ? `🎤 आपने कहा: “${shown}”` : `🎤 You said: “${shown}”`);
  // Both transcripts go on when they differ, so the assistant can settle names and places.
  return handleInbound(mobile, local && sarvam && local !== sarvam ? `${local}\n(${sarvam})` : shown, profileName);
}

export async function handleInbound(mobile: string, raw: string, profileName?: string) {
  const text = raw.trim().slice(0, 1000);
  if (!text) return;
  store.whatsapp.insert({ id: randomUUID(), mobile, dir: "in", text, at: new Date().toISOString(), status: "received" });
  const conv = conversations.get(mobile) ?? { history: [] };
  conversations.set(mobile, conv);
  conv.history.push({ from: "me", text });
  // A chosen language wins; otherwise answer in the script the citizen wrote in.
  const pref = await getLang(mobile);
  const hi = pref ? readsHindi(pref) : isHindi(text) || (conv.pending?.hi ?? false);
  const chat: LangCode = pref ?? (hi ? "hi" : "en");
  const session: CitizenSession = { role: "citizen", mobile, name: profileName };
  const word = text.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();

  // Language: the menu, a number from it, or just a language's name.
  const chosen = languageChoice(text, conv.askLang ?? false);
  conv.askLang = false;
  if (chosen) {
    await setLang(mobile, chosen);
    if (conv.pending) conv.pending.hi = readsHindi(chosen);
    return reply(mobile, LANG_SET[chosen]);
  }
  if (["LANGUAGE", "LANG", "CHANGE LANGUAGE", "LANGUAGES"].includes(word) || /^(भाषा|भाषा बदलें|भाषा बदलो|भाषा बदलना)$/.test(text.replace(/[.।!?*]/g, "").trim())) {
    conv.askLang = true;
    return reply(mobile, LANG_MENU);
  }

  // A complaint in progress
  if (conv.pending) {
    const p = conv.pending;
    if (NO.test(text)) {
      conv.pending = undefined;
      return reply(mobile, p.hi ? "ठीक है, शिकायत दर्ज नहीं की गई। आप समस्या फिर से लिख सकते हैं।" : "Okay, nothing was registered. You can describe the problem again any time.");
    }
    if (p.stage === "district") {
      const d = findDistrict(text);
      if (!d) return reply(mobile, p.hi ? "जनपद का नाम समझ नहीं आया। कृपया जनपद लिखें, जैसे: पौड़ी, अल्मोड़ा, देहरादून।" : "I couldn't find that district. Please type the district, for example: Pauri, Almora, Dehradun.");
      p.districtId = d;
      p.stage = "confirm";
      return reply(mobile, confirmText(p));
    }
    if (p.stage === "confirm" && YES.test(text)) {
      conv.pending = undefined;
      try {
        // Same problem at the same place already open: join it instead of registering it again.
        const dup = await findDuplicate({ mobile, departmentId: p.departmentId, districtId: p.districtId!, categoryId: p.categoryId, text: p.formal ? `${p.formal.subject}. ${p.formal.description}\n${p.description}` : p.description });
        if (dup) {
          const joined = joinDuplicate(session, dup);
          // The citizen's photo still helps the officer if that complaint has none.
          if (p.photo && !dup.photos?.before) grievances.addCitizenPhoto(dup.id, mobile, { dataUrl: p.photo });
          return reply(mobile, duplicateMessage(dup, joined, p.hi));
        }
        const created = grievances.create(
          session,
          {
            name: profileName || (p.hi ? "नागरिक" : "Citizen"),
            type: "complaint",
            departmentId: p.departmentId,
            categoryId: p.categoryId,
            subject: (p.formal?.subject || p.description).slice(0, 118).padEnd(5, "."),
            description: (p.formal?.description || p.description).padEnd(20, "."),
            districtId: p.districtId!,
            triage: { source: aiEnabled() ? "ai" : "rules", confidence: 0.8, urgency: p.urgency },
            whatsapp: true,
            lang: pref ?? (p.hi ? "hi" : "en"),
            photo: p.photo ? { dataUrl: p.photo } : undefined,
          },
          "whatsapp",
        );
        if (p.location) grievances.setLocation(created.id, { mobile }, p.location.lat, p.location.lng, "whatsapp");
        // The registration message itself is sent by the change listener.
        return;
      } catch (err) {
        return reply(mobile, errorText(err, p.hi));
      }
    }
    if (p.stage === "confirm") return reply(mobile, p.hi ? "दर्ज करने हेतु *हाँ* लिखें, या रद्द करने हेतु *नहीं*।" : "Reply *YES* to register it, or *NO* to cancel.");
  }

  // Quick commands
  const latest = (open: boolean) =>
    store.grievances
      .all()
      .filter((g) => g.citizenMobile === mobile && (open ? g.status !== "resolved" && g.status !== "closed" : g.status === "resolved"))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];

  if (/^[1-5]$/.test(word) && latest(false)) {
    try {
      grievances.giveFeedback(session, latest(false)!.id, Number(word));
      return;
    } catch (err) {
      return reply(mobile, errorText(err, hi));
    }
  }
  if (word.startsWith("REOPEN") || text.startsWith("दोबारा")) {
    const g = latest(false);
    if (!g) return reply(mobile, hi ? "पुनः खोलने हेतु कोई निस्तारित शिकायत नहीं है।" : "There's no resolved complaint to reopen.");
    try {
      grievances.reopen(session, g.id, text.length > 12 ? text : "Problem not fixed (reopened on WhatsApp)");
      return;
    } catch (err) {
      return reply(mobile, errorText(err, hi));
    }
  }
  if (word.startsWith("REMIND") || text.includes("अनुस्मारक")) {
    const g = latest(true);
    if (!g) return reply(mobile, hi ? "कोई खुली शिकायत नहीं है।" : "You have no open complaints.");
    try {
      grievances.remind(session, g.id);
      return;
    } catch (err) {
      return reply(mobile, errorText(err, hi));
    }
  }
  if (word === "STATUS" || /CMH[-\s]?\d{4}/i.test(text) || text.includes("स्थिति")) return reply(mobile, statusLines(mobile, hi));
  if (["HI", "HELLO", "HELP", "MENU", "NAMASTE", "START"].includes(word) || /^(नमस्ते|नमस्कार)/.test(text)) return reply(mobile, menu(hi));

  // Free text: the guarded assistant decides whether it is a complaint, a question, or out of scope.
  let kind: "complaint" | "other" = text.length >= 25 ? "complaint" : "other";
  let answer = "";
  let emergency = false;
  if (aiEnabled()) {
    try {
      const out = await assistant(conv.history, chat);
      kind = out.kind === "complaint" ? "complaint" : "other";
      emergency = out.kind === "emergency";
      answer = emergency ? `🚨 ${out.reply}` : out.reply;
    } catch {
      // Use the length heuristic.
    }
  }
  if (emergency) await reply(mobile, answer);
  if (kind === "other" && !emergency) return reply(mobile, answer || menu(hi));

  const route = await triage(text);
  let formal: Pending["formal"];
  if (aiEnabled()) {
    try {
      const d = await draft(text, hi ? "hi" : "en");
      if (d.isGrievance) formal = { subject: d.subject, description: d.description };
    } catch {
      // Keep the citizen's own words.
    }
  }
  const p: Pending = { description: text, formal, departmentId: route.departmentId, categoryId: route.categoryId, urgency: route.urgency, districtId: findDistrict(text), hi, stage: "confirm" };
  if (!p.districtId) p.stage = "district";
  // A photo sent before the problem was described goes with this complaint.
  if (conv.photo) (p.photo = conv.photo), (conv.photo = undefined);
  if (conv.location) (p.location = conv.location), (conv.location = undefined);
  conv.pending = p;
  return reply(mobile, p.stage === "district" ? (hi ? `समझ गई। यह ${deptName(p.departmentId, true)} का विषय है।\n\nयह किस जनपद में है?` : `Understood. This is for ${deptName(p.departmentId, false)}.\n\nWhich district is this in?`) : confirmText(p));
}

function confirmText(p: Pending) {
  const d = districts.find((x) => x.id === p.districtId);
  const body = p.formal ? `*${p.formal.subject}*\n${p.formal.description}` : p.description;
  return p.hi
    ? `मैंने आपकी शिकायत औपचारिक भाषा में लिखी है:\n\n${body}\n\n🏢 ${deptName(p.departmentId, true)}\n📍 ${d?.name.hi ?? ""}${p.urgency === "high" ? "\n⚠️ अत्यावश्यक" : ""}\n\nदर्ज करने हेतु *हाँ* लिखें, या *नहीं*।`
    : `I've written your complaint formally:\n\n${body}\n\n🏢 ${deptName(p.departmentId, false)}\n📍 ${d?.name.en ?? ""}${p.urgency === "high" ? "\n⚠️ Urgent" : ""}\n\nReply *YES* to register it, or *NO*.`;
}

/* ------------------------------------------------------------------ */
/* WhatsApp Cloud API webhook                                          */
/* ------------------------------------------------------------------ */

export function verifySignature(rawBody: Buffer | undefined, header: string | undefined) {
  if (!config.whatsapp.appSecret) return true;
  if (!rawBody || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", config.whatsapp.appSecret).update(rawBody).digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type WebhookBody = { entry?: { changes?: { value?: { contacts?: { profile?: { name?: string }; wa_id?: string }[]; messages?: { from: string; type: string; text?: { body: string } }[] } }[] }[] };

export function handleWebhook(body: WebhookBody) {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      for (const msg of v?.messages ?? []) {
        if (msg.type !== "text" || !msg.text?.body) continue;
        const mobile = msg.from.replace(/^91/, "").slice(-10);
        const name = v?.contacts?.find((c) => c.wa_id === msg.from)?.profile?.name;
        void handleInbound(mobile, msg.text.body, name).catch((err) => console.warn("WhatsApp inbound failed", err));
      }
    }
  }
}
