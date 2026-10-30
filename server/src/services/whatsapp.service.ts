import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { departments, districts, levels } from "../data/catalog.js";
import { store } from "../data/store.js";
import { HttpError } from "../lib/httpError.js";
import { aiEnabled } from "../lib/llm.js";
import type { CitizenSession, Grievance, TimelineEntry, WhatsAppMessage } from "../types.js";
import { assistant, draft, translate, type LangCode } from "./ai.service.js";
import * as grievances from "./grievance.service.js";
import { triage } from "./triage.service.js";

/*
 * WhatsApp channel for CM Helpline 1905.
 * - Every update on a complaint (registered, officer note, escalation, resolution with photo, reminder,
 *   reopening, neighbours joining) is sent to the citizen on WhatsApp.
 * - Citizens can reply: ask for status, send a reminder, rate, reopen, or describe a new problem.
 *   AI writes the complaint formally, routes it, and registers it after the citizen says YES.
 * Without a WhatsApp Business account the messages are kept and shown in the demo phone ("simulated").
 */

const cloudEnabled = () => Boolean(config.whatsapp.token && config.whatsapp.phoneId);
export const whatsappStatus = () => ({ mode: cloudEnabled() ? "cloud" : "simulated", ai: aiEnabled() });

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
  const m: WhatsAppMessage = { id: randomUUID(), mobile, dir: "out", text, at: new Date().toISOString(), status: cloudEnabled() ? "sent" : "simulated", ...extra };
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
          ? `🙏 नमस्ते ${g.citizenName}। आपकी शिकायत *${g.id}* मुख्यमंत्री हेल्पलाइन 1905 पर दर्ज हो गई है।\n\n📌 ${g.subject}\n🏢 ${deptName(g.departmentId, true)} · ${officer} (L1)\n⏳ कार्यवाही की समय सीमा: ${due}\n\nहर अद्यतन यहीं मिलेगा। स्थिति जानने हेतु *STATUS* लिखें।`
          : `🙏 Namaste ${g.citizenName}. Your complaint *${g.id}* is registered with CM Helpline 1905.\n\n📌 ${g.subject}\n🏢 ${deptName(g.departmentId, false)} · ${officer} (L1)\n⏳ Action due by ${due}\n\nYou'll get every update here. Reply *STATUS* any time.`,
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
  const hi = g.lang === "hi" || ["gbm", "kfy"].includes(g.lang ?? "");
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

type Pending = { description: string; formal?: { subject: string; description: string }; departmentId: string; categoryId: string; urgency: "normal" | "high"; districtId?: string; hi: boolean; stage: "district" | "confirm" };
const conversations = new Map<string, { pending?: Pending; history: { from: "me" | "bot"; text: string }[] }>();

const isHindi = (s: string) => /[ऀ-ॿ]/.test(s);
const YES = /^(yes|y|haan|ha|han|ji|ok|okay|हाँ|हां|जी|ठीक)\b/i;
const NO = /^(no|n|nahi|nahin|cancel|नहीं|रद्द)\b/i;

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
    ? "नमस्ते! मैं सहायक हूँ, मुख्यमंत्री हेल्पलाइन 1905 की ओर से। 🙏\n\n• अपनी समस्या लिखें — मैं उसे दर्ज कराऊँगी\n• *STATUS* — अपनी शिकायतों की स्थिति\n• *REMIND* — अधिकारी को अनुस्मारक\n• आपात स्थिति: 112"
    : "Namaste! I'm Sahayak from CM Helpline 1905. 🙏\n\n• Describe your problem — I'll register it\n• *STATUS* — your complaints\n• *REMIND* — remind the officer\n• Emergency: 112";

async function reply(mobile: string, text: string) {
  const conv = conversations.get(mobile)!;
  conv.history.push({ from: "bot", text });
  conv.history.splice(0, Math.max(0, conv.history.length - 10));
  send(mobile, text);
}

function errorText(err: unknown, hi: boolean) {
  if (err instanceof HttpError) return err.message;
  return hi ? "अभी यह नहीं हो सका। कृपया फिर प्रयास करें या 1905 पर कॉल करें।" : "That didn't work right now. Please try again, or call 1905.";
}

export async function handleInbound(mobile: string, raw: string, profileName?: string) {
  const text = raw.trim().slice(0, 1000);
  if (!text) return;
  store.whatsapp.insert({ id: randomUUID(), mobile, dir: "in", text, at: new Date().toISOString(), status: "received" });
  const conv = conversations.get(mobile) ?? { history: [] };
  conversations.set(mobile, conv);
  conv.history.push({ from: "me", text });
  const hi = isHindi(text) || (conv.pending?.hi ?? false);
  const session: CitizenSession = { role: "citizen", mobile, name: profileName };
  const word = text.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();

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
        grievances.create(
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
            lang: p.hi ? "hi" : "en",
          },
          "whatsapp",
        );
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
      const out = await assistant(conv.history, hi ? "hi" : "en");
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
