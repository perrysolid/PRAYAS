import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { departments, districts } from "../data/catalog.js";
import { store } from "../data/store.js";
import { claude, claudeEnabled } from "../lib/claude.js";
import { HttpError } from "../lib/httpError.js";
import * as grievances from "../services/grievance.service.js";
import { triageWithRules } from "../services/triage.service.js";
import type { CallLine } from "../types.js";
import { detectPahari, garhwaliEnabled, transcribeGarhwali, type Pahari } from "./garhwali.js";
import { duplicateMessage, duplicateSpoken, findDuplicate, joinDuplicate } from "../services/duplicate.service.js";
import { send } from "../services/whatsapp.service.js";
import { LINES, SYSTEM, confirmLine, emptySlots, mergeSlots, registeredLine, spokenNumber, splitReply, statusLine, takeSentences, turnMessage, type Action, type Slots } from "./prompt.js";
import { getLang, setLang } from "../services/prefs.service.js";
import { LevelMeter } from "./level.js";
import { note } from "./log.js";
import { Listener, Speaker } from "./sarvam.js";

/*
 * One phone call with the helpline's voice agent, independent of how audio arrives
 * (Exotel phone line or the browser practice call).
 *
 *   caller audio → Sarvam speech-to-text (turn detection, partials) → Claude, streamed
 *   → each finished sentence → Sarvam text-to-speech → caller
 *
 * The caller can talk over the agent at any time. Registration happens only after the agent
 * has read the complaint back and the caller agreed, and it goes through the same rules
 * as the website (department routing, deadlines, escalation, WhatsApp updates).
 */

export type Transport = {
  sampleRate: 8000 | 16000;
  /** Raw 16-bit mono PCM at `sampleRate`. */
  sendAudio(pcm: Buffer): void;
  /** Report back through `played(name)` once everything sent before this point has been heard. */
  mark(name: string): void;
  /** Drop audio that has not been played yet. */
  clear(): void;
  hangup(): void;
  /** Live captions and status for the browser practice call. */
  event?(e: Record<string, unknown>): void;
};

type Lang = "hi" | "en";

const MAX_CALL_MS = 7 * 60_000;
const SILENCE_MS = 12_000;
const greetingCache = new Map<string, Buffer>();
let activeCalls = 0;

export const callsInProgress = () => activeCalls;

/* ------------------------------------------------------------------ */
/* All lines busy: no waiting, WhatsApp instead                         */
/* ------------------------------------------------------------------ */

const BUSY_LINE = "नमस्ते, मुख्यमंत्री हेल्पलाइन। इस समय सभी लाइनें व्यस्त हैं, इसलिए आपको इंतज़ार नहीं करवाएँगे। हमने आपके व्हाट्सऐप पर संदेश भेजा है। वहीं अपनी समस्या लिखकर या बोलकर भेज दीजिए, शिकायत तुरंत दर्ज हो जाएगी। या थोड़ी देर बाद फिर कॉल करें। धन्यवाद।";
const BUSY_WHATSAPP = "🙏 नमस्ते! आपने अभी मुख्यमंत्री हेल्पलाइन पर कॉल किया था, पर उस समय सभी लाइनें व्यस्त थीं।\n\nइंतज़ार की ज़रूरत नहीं: अपनी समस्या यहीं लिखें या 🎤 बोलकर भेजें, मैं तुरंत आपकी शिकायत दर्ज कर दूँगी।\n\nYou called CM Helpline while all lines were busy. Type your problem here or send a voice note, and I'll register it right away.";
const busyAudio = new Map<number, Promise<Buffer | null>>();

/** The busy message as audio, made once per sample rate and reused, so an overloaded moment needs no new speech. */
export function busyLineAudio(rate: 8000 | 16000): Promise<Buffer | null> {
  let p = busyAudio.get(rate);
  if (!p) {
    p = (async () => {
      const speaker = new Speaker(rate);
      try {
        const parts: Buffer[] = [];
        const out = await speaker.begin("hi", (pcm) => parts.push(pcm));
        out.say(BUSY_LINE);
        out.end();
        await out.finished;
        return parts.length ? Buffer.concat(parts) : null;
      } catch (err) {
        note(`busy line could not be made: ${err instanceof Error ? err.message : err}`);
        busyAudio.delete(rate);
        return null;
      } finally {
        speaker.close();
      }
    })();
    busyAudio.set(rate, p);
  }
  return p;
}

/**
 * A caller who arrives when every line is taken: instead of silence or a queue, they hear one short message,
 * get a WhatsApp message where the bot registers the complaint at once, and the call ends.
 */
export async function overflowCall(t: Transport, mobile: string) {
  note("all lines busy: caller sent to WhatsApp instead of waiting");
  send(mobile, BUSY_WHATSAPP);
  const audio = await busyLineAudio(t.sampleRate);
  if (audio) t.sendAudio(audio);
  t.mark("busy");
}

/** District names help speech recognition with place names it would otherwise mishear. */
const KEYTERMS = [...districts.flatMap((d) => [d.name.hi, d.name.en]), "उत्तराखंड", "मुख्यमंत्री हेल्पलाइन", "जल संस्थान", "यूपीसीएल"];

const letters = (s: string) => s.replace(/[\s.,।?!'"-]/g, "").length;
/** "हाँ", "जी", "अच्छा": the caller is listening, not taking the turn. */
const BACKCHANNEL = /^(हाँ|हां|हा|जी|हाँ जी|जी हाँ|हम्म*|हूँ|अच्छा|अच्छा जी|ठीक है|ठीक|ओके|ok|okay|yes|yeah|हेलो|हैलो|hello|नहीं|नही|no)[\s.,।?!]*$/iu;
/** A short answer to the read-back ("हाँ जी, दर्ज कर दीजिए", "नहीं, गाँव गलत है"), kept if said over it. */
const CONSENT = /(हाँ|हां|जी|ठीक|सही|दर्ज|नहीं|नही|गलत|yes|no|okay|ok|correct|register)/iu;
/** Hesitation sounds and stray syllables: never a turn on their own. */
const FILLER = /^(हम्म*|ह्म्म*|हूं*|अं+|अ+|उम्म*|उं+|आं*|ए|ओ|hmm*|umm*|uh+|ah+|oh)[\s.,।?!]*$/iu;
/** While the agent is talking, only clear speech counts as the caller taking the turn; a cough, a horn or a short "हाँ" does not. */
const takesTurn = (s: string) => !BACKCHANNEL.test(s.trim()) && ((letters(s) >= 6 && s.trim().split(/\s+/).length >= 2) || letters(s) >= 9);

/** A reply that only names a language, as asked in the greeting. */
function languageNamed(text: string): "hi" | "en" | Pahari | null {
  const t = text.trim().toLowerCase().replace(/[.,।?!]/g, "").replace(/\s*(में|मा|मैं|ही|जी|please|में बात करें|में बात करनी है)\s*/g, " ").trim();
  if (/^(हिंदी|हिन्दी|hindi)$/.test(t)) return "hi";
  if (/^(english|इंग्लिश|अंग्रेज़ी|अंग्रेजी|इंग्लिश)$/.test(t)) return "en";
  if (/^(गढ़वाली|गढ़वळि|गढ़वाळी|garhwali)$/.test(t)) return "gbm";
  if (/^(कुमाऊँनी|कुमाऊंनी|कुमाउनी|kumaoni|kumauni)$/.test(t)) return "kfy";
  return null;
}

export class CallAgent {
  private listener: Listener;
  private meter: LevelMeter;
  /** The last transcript was set aside as someone else in the room. */
  private backgroundOnce = false;
  private speaker: Speaker;
  private slots: Slots = emptySlots();
  private lang: Lang = "hi";
  /** Garhwali or Kumaoni: the local speech model leads. */
  private local: Pahari | null = null;
  /** The caller has picked a language (by voice or keypad). */
  private chosen = false;
  private lastAction: Action | null = null;
  private history: Anthropic.MessageParam[] = [];
  private transcript: CallLine[] = [];
  private heard = "";
  /** When each stage of the current reply started, for the diagnostics page. */
  private timing: { id: number; start: number; words?: number; sentence?: number; audio?: number } = { id: 0, start: 0 };
  /** A yes or no said over the read-back, answered once the agent finishes. */
  private queued?: string;
  private turn = 0;
  private abort?: AbortController;
  /** Audio has been sent that the caller has not finished hearing. */
  private speaking = false;
  private endAfterPlayback = false;
  private ended = false;
  private registeredId?: string;
  /** The caller was added to an existing complaint instead of registering a new one. */
  private joinedExisting = false;
  private silenceTimer?: NodeJS.Timeout;
  private silentPrompts = 0;
  private startedAt = Date.now();
  private maxTimer?: NodeJS.Timeout;
  /** The caller's audio from the last ~20 s, for the Garhwali recogniser. */
  private audio: Buffer[] = [];
  private audioBytes = 0;
  private audioStart = 0;
  private utteranceAt = 0;

  constructor(
    private readonly t: Transport,
    private readonly mobile: string,
    private readonly via: "exotel" | "browser",
  ) {
    this.listener = new Listener(t.sampleRate, KEYTERMS);
    this.meter = new LevelMeter(t.sampleRate);
    this.speaker = new Speaker(t.sampleRate);
    this.speaker.warm();
    activeCalls += 1;

    this.listener.on("speechStart", () => {
      this.clearSilence();
      this.utteranceAt = Math.max(this.audioStart, this.audioStart + this.audioBytes - this.t.sampleRate); // ~0.5 s before
    });
    this.listener.on("partial", (text) => {
      this.clearSilence();
      // Stop only for the caller really taking the turn: clear words, as loud as the caller, for 0.7 s.
      // A horn, a cough, a "हाँ" or a voice in the background does not stop the agent.
      if ((this.speaking || this.abort) && takesTurn(text)) {
        if (this.meter.recentCallerMs(1500) >= (this.meter.knowsVoice ? 700 : 1000)) this.interrupt();
      }
      this.t.event?.({ type: "caption", who: "citizen", text, final: false });
    });
    this.listener.on("final", (text) => void this.onFinal(text));
    this.listener.on("error", (msg) => {
      note(`speech-to-text error: ${msg}`);
      this.t.event?.({ type: "error", message: "Speech recognition is unavailable" });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Call lifecycle                                                      */
  /* ------------------------------------------------------------------ */

  async start() {
    this.maxTimer = setTimeout(() => void this.say(LINES.timeUp[this.lang], { end: true }), MAX_CALL_MS);
    if (!claudeEnabled()) return this.say(LINES.sorry.hi, { end: true });
    // A caller who chose Garhwali or Kumaoni before (on WhatsApp or a call) gets the local model from the start.
    void getLang(this.mobile).then((p) => (p === "gbm" || p === "kfy") && !this.chosen && this.goLocal(p, "saved preference"));
    await this.say(LINES.greeting.hi, { cacheKey: `greet:${this.t.sampleRate}` });
  }

  /** Caller audio from the line. */
  feed(pcm: Buffer) {
    if (this.ended) return;
    this.listener.feed(pcm);
    this.meter.feed(pcm);
    this.audio.push(pcm);
    this.audioBytes += pcm.length;
    const cap = this.t.sampleRate * 2 * 20;
    while (this.audioBytes > cap && this.audio.length > 1) {
      const dropped = this.audio.shift()!;
      this.audioBytes -= dropped.length;
      this.audioStart += dropped.length;
    }
  }

  /** Keypad: 1 Hindi, 2 English, as the greeting says. */
  dtmf(digit: string) {
    const lang = ({ "1": "hi", "2": "en" } as const)[digit as "1" | "2"];
    if (lang) this.choose(lang, "keypad");
  }

  /** The caller picked a language: switch and invite them to speak. */
  private choose(lang: "hi" | "en" | Pahari, why: string) {
    if (lang === "gbm" || lang === "kfy") this.goLocal(lang, why);
    else (this.lang = lang), (this.local = null), note(`caller chose ${lang === "en" ? "English" : "Hindi"} (${why})`);
    this.chosen = true;
    void this.say(LINES.langSet[lang]);
  }

  private goLocal(lang: Pahari, why: string) {
    if (this.local === lang) return;
    this.local = lang;
    this.lang = "hi";
    note(`caller speaks ${lang === "gbm" ? "Garhwali" : "Kumaoni"} (${why}); local speech model ${garhwaliEnabled() ? "on" : "not configured, Sarvam only"}`);
  }

  /** The transport has played everything up to `name`. */
  played(name: string) {
    if (name !== `t${this.turn}`) return;
    this.speaking = false;
    if (this.endAfterPlayback) return this.finish();
    const q = this.queued;
    this.queued = undefined;
    if (q) return void this.onFinal(q, true);
    this.armSilence();
  }

  /** The line closed. Saves nothing more; a registered complaint is already stored. */
  stop() {
    if (this.ended) return;
    this.ended = true;
    activeCalls = Math.max(0, activeCalls - 1);
    this.abort?.abort();
    clearTimeout(this.maxTimer);
    this.clearSilence();
    this.listener.close();
    this.speaker.close();
    this.attachTranscript();
  }

  private finish() {
    this.t.event?.({ type: "end", registered: this.registeredId ?? null });
    this.stop();
    this.t.hangup();
  }

  private armSilence() {
    this.clearSilence();
    this.silenceTimer = setTimeout(() => {
      this.silentPrompts += 1;
      if (this.silentPrompts > 2) void this.say(LINES.goodbyeSilent[this.lang], { end: true });
      else void this.say(LINES.stillThere[this.lang]);
    }, SILENCE_MS);
  }

  private clearSilence() {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = undefined;
  }

  /** Caller talked over the agent: stop speaking and listen. */
  private interrupt() {
    const busy = Boolean(this.abort) || this.speaking;
    this.abort?.abort();
    this.abort = undefined;
    // Only a reply in progress needs its speech socket closed; an idle one is kept for the next turn.
    if (busy) this.speaker.interrupt();
    if (this.speaking) this.t.clear();
    this.speaking = false;
    this.endAfterPlayback = false;
    this.queued = undefined;
  }

  /* ------------------------------------------------------------------ */
  /* Turns                                                               */
  /* ------------------------------------------------------------------ */

  private async onFinal(text: string, queued = false) {
    if (this.ended || !text) return;
    const u = queued ? null : this.meter.utterance();
    if (u) {
      const quiet = u.ms < 150;
      // Mostly at the caller's loudness, not a quieter voice with a few loud syllables.
      if (this.speaking && (!takesTurn(text) || u.callerMs < 700 || u.callerMs < u.ms * 0.5)) {
        // Noise, a backchannel or a background voice while the agent talks: keep talking. A "हाँ" over the read-back still counts once it ends.
        if (this.lastAction === "confirm" && CONSENT.test(text) && letters(text) <= 30 && !quiet) this.queued = text;
        note(`kept talking over: ${text.slice(0, 40)} (${u.callerMs} ms at the caller's loudness)`);
        return;
      }
      if (!this.speaking && (quiet || FILLER.test(text.trim()) || letters(text) < 2)) {
        note(`ignored as noise: ${text.slice(0, 40)} (${u.ms} ms of clear sound, floor ${this.meter.noiseFloor.toFixed(0)} dB)`);
        if (!this.abort) this.armSilence();
        return;
      }
      // A sentence mostly quieter than the caller is someone else in the room. Two in a row are taken as the
      // caller after all (they may have stepped back from the phone), so nobody is ignored for long.
      if (!this.speaking && this.meter.knowsVoice && u.ms >= 600 && u.callerMs < u.ms * 0.5 && !this.backgroundOnce) {
        this.backgroundOnce = true;
        note(`ignored as a background voice: ${text.slice(0, 40)} (${u.callerMs} of ${u.ms} ms at the caller's loudness)`);
        if (!this.abort) this.armSilence();
        return;
      }
      this.backgroundOnce = false;
      if (this.abort && !this.speaking && !takesTurn(text)) {
        // Still working on the answer to what the caller just said: a "हाँ" or "जी" adds nothing.
        note(`ignored while thinking: ${text.slice(0, 40)}`);
        return;
      }
      this.meter.learn(u.db);
    }
    this.silentPrompts = 0;
    this.log("citizen", text);
    note(`heard: ${text.slice(0, 80)}${u ? ` (${u.callerMs} of ${u.ms} ms at the caller's loudness)` : ""}`);
    this.t.event?.({ type: "caption", who: "citizen", text, final: true });
    // Several short finals in a row ("हाँ", "पौड़ी में") are answered together.
    this.heard = this.heard ? `${this.heard} ${text}` : text;
    // Just a language name ("हिंदी", "English", "गढ़वाली में"): switch at once, no model needed.
    const named = languageNamed(text);
    if (named) {
      this.heard = "";
      return this.choose(named, "voice");
    }
    const spotted = detectPahari(text);
    if (spotted) this.goLocal(spotted, "words");

    let localText: Promise<string | null> = Promise.resolve(null);
    if (this.local && garhwaliEnabled()) {
      const from = Math.max(0, this.utteranceAt - this.audioStart);
      localText = transcribeGarhwali(Buffer.concat(this.audio).subarray(from), this.t.sampleRate).then((t) => {
        note(t ? `local model heard: ${t.slice(0, 80)}` : "local model gave nothing in time; using Sarvam's words");
        return t;
      });
    }
    this.interrupt();
    await this.reply(await localText);
  }

  private async reply(localText: string | null) {
    const heard = this.heard;
    const id = ++this.turn;
    const abort = new AbortController();
    this.abort = abort;
    this.timing = { id, start: Date.now() };
    const user: Anthropic.MessageParam = { role: "user", content: turnMessage(heard, this.slots, this.lastAction, this.lang, this.local, localText) };
    const out = await this.speaker.begin(this.lang, (pcm) => this.audioOut(id, pcm)).catch((e: Error) => (note(`text-to-speech failed: ${e.message}`), null));
    if (!out) return this.say(LINES.sorry[this.lang], { end: true });

    let raw = "";
    let pending = "";
    let spokenUpTo = 0;
    try {
      const stream = claude().messages.stream(
        {
          model: config.voice.model,
          max_tokens: 800,
          thinking: { type: "disabled" },
          output_config: { effort: "low" },
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: [...this.history, user],
        },
        { signal: abort.signal },
      );
      for await (const ev of stream) {
        if (abort.signal.aborted) return;
        if (ev.type !== "content_block_delta" || ev.delta.type !== "text_delta") continue;
        raw += ev.delta.text;
        this.timing.words ??= Date.now();
        const cut = raw.indexOf("###");
        // Hold back a trailing "#" or "##" that may be the start of the separator.
        const speechSoFar = cut >= 0 ? raw.slice(0, cut) : raw.replace(/#{1,2}$/, "");
        pending += speechSoFar.slice(spokenUpTo);
        spokenUpTo = speechSoFar.length;
        const { ready, rest } = takeSentences(pending);
        pending = rest;
        for (const s of ready) {
          this.timing.sentence ??= Date.now();
          out.say(s);
        }
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      note(`model failed${err instanceof Anthropic.APIError ? ` (${err.status})` : ""}: ${err instanceof Error ? err.message.slice(0, 120) : ""}`);
      out.say(LINES.sorry[this.lang]);
      out.end();
      this.endAfterPlayback = true;
      await out.finished.catch(() => {});
      return this.afterSpeech(id);
    }
    if (abort.signal.aborted) return;

    const { speech, json } = splitReply(raw);
    if (pending.trim()) out.say(pending);
    this.heard = "";
    this.history.push(user, { role: "assistant", content: raw.trim() || "###\n{}" });
    // Keep the prompt short on long calls; the state block carries what matters.
    if (this.history.length > 24) this.history.splice(0, this.history.length - 24);
    if (speech) this.log("agent", speech);

    if (json) {
      this.slots = mergeSlots(this.slots, json);
      if (json.lang === "gbm" || json.lang === "kfy") this.goLocal(json.lang, "language model");
      else if (json.lang === "en") (this.lang = "en"), (this.local = null);
    }
    const action = json?.action ?? "ask";
    const extra = await this.act(action);
    if (abort.signal.aborted) return;
    if (extra.line) {
      out.say(extra.line);
      this.log("agent", extra.line);
      this.history.push({ role: "user", content: `<system_note>${extra.note}</system_note>` }, { role: "assistant", content: `${extra.line}\n###\n${JSON.stringify({ action: "ask" })}` });
    }
    // A register the system turned into a read-back counts as a confirm; one that lacked details does not.
    // A "confirm" only counts as the read-back when it asked to register ("…दर्ज कर दूँ?"), not when it checked one detail.
    const askedToRegister = action === "confirm" && /दर्ज|register/i.test(speech);
    this.lastAction = action === "register" && !this.registeredId ? (extra.readBack ? "confirm" : "ask") : action === "confirm" && !askedToRegister ? "ask" : action;
    if (action === "end") this.endAfterPlayback = true;
    out.end();
    await out.finished.catch(() => {});
    if (abort.signal.aborted) return;
    if (this.abort === abort) this.abort = undefined;
    this.afterSpeech(id);
  }

  /** Work the agent asked for. Returns a line for the system to speak, with a note for the model. */
  private async act(action: Action): Promise<{ line?: string; note?: string; readBack?: boolean }> {
    if (action === "status") {
      const mine = store.grievances
        .all()
        .filter((g) => g.citizenMobile === this.mobile)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      return { line: statusLine(mine, this.lang), note: "The system read out the caller's complaint status." };
    }
    if (action !== "register" || this.registeredId) return {};
    // Registration needs the essentials and a read-back the caller agreed to.
    if (!this.slots.problem) return { line: LINES.missing.problem[this.lang], note: "Registration needs the problem." };
    if (!this.slots.districtId) return { line: LINES.missing.districtId[this.lang], note: "Registration needs the district." };
    if (this.lastAction !== "confirm") return { line: confirmLine(this.slots, this.lang), note: "The system read the complaint back. Register only after the caller agrees.", readBack: true };
    return await this.register();
  }

  private async register(): Promise<{ line: string; note: string }> {
    const s = this.slots;
    const text = [s.problem, s.since, s.summary].filter(Boolean).join(". ");
    const rules = triageWithRules(text);
    const departmentId = s.departmentId ?? rules.departmentId;
    const dept = departments.find((d) => d.id === departmentId)!;
    const categoryId = rules.departmentId === departmentId ? rules.categoryId : dept.categories[0].id;
    const session = { role: "citizen" as const, mobile: this.mobile, name: s.name ?? undefined };

    // Same problem at the same place already open: join it and tell the caller when it was registered.
    const dup = await findDuplicate({ mobile: this.mobile, departmentId, districtId: s.districtId!, categoryId, block: s.block ?? undefined, village: s.village ?? undefined, text: [s.subject, text].filter(Boolean).join(". ") }).catch(() => null);
    if (dup && !this.ended) {
      try {
        const r = joinDuplicate(session, dup);
        this.registeredId = dup.id;
        this.joinedExisting = true;
        this.t.event?.({ type: "registered", id: dup.id, existing: true });
        send(this.mobile, duplicateMessage(dup, r, this.lang !== "en"), { grievanceId: dup.id });
        console.log(`[voice] caller joined existing ${dup.id}`);
        return { line: duplicateSpoken(dup, r, this.lang, spokenNumber(dup.id, this.lang)), note: `Already registered as ${dup.id}; the caller was added to it. Do not register again in this call.` };
      } catch {
        // Could not join (e.g. it was just resolved): register a new one below.
      }
    }
    const description = (s.summary || [s.problem, s.since ? `(${s.since})` : ""].join(" ")).trim();
    try {
      const g = grievances.create(
        session,
        {
          name: s.name || (this.lang === "en" ? "Citizen" : "नागरिक"),
          type: "complaint",
          departmentId,
          categoryId,
          subject: (s.subject || s.problem || "").slice(0, 118).padEnd(5, "."),
          description: description.padEnd(20, "."),
          districtId: s.districtId!,
          block: s.block ?? undefined,
          village: s.village ?? undefined,
          triage: { source: "ai", confidence: 0.85, urgency: s.urgent || rules.urgency === "high" ? "high" : "normal" },
          whatsapp: true,
          lang: this.local ?? this.lang,
          call: { transcript: [...this.transcript], language: this.local ?? this.lang, seconds: Math.round((Date.now() - this.startedAt) / 1000), via: this.via },
        },
        "phone",
      );
      this.registeredId = g.id;
      this.t.event?.({ type: "registered", id: g.id });
      // Updates and later WhatsApp chats follow the language of this call.
      const callLang = this.local ?? this.lang;
      void getLang(this.mobile).then((p) => {
        if (!p || this.chosen) void setLang(this.mobile, callLang);
      });
      console.log(`[voice] registered ${g.id} from a ${this.via} call`);
      return { line: registeredLine(g, this.lang, true), note: `Registered as ${g.id}. Do not register again in this call.` };
    } catch (err) {
      const msg = err instanceof HttpError ? err.message : "";
      const line =
        err instanceof HttpError && err.code === "OPEN_LIMIT"
          ? this.lang === "en"
            ? "This number already has ten open complaints, the most the rules allow. Please wait until one is resolved."
            : "इस नंबर पर पहले से दस शिकायतें लंबित हैं, नियम के अनुसार इससे अधिक नहीं हो सकतीं। कृपया किसी एक के निस्तारण की प्रतीक्षा करें।"
          : LINES.sorry[this.lang];
      return { line, note: `Registration failed: ${msg || "error"}.` };
    }
  }

  /** Marks the end of a reply so playback completion can be detected. */
  private afterSpeech(id: number) {
    if (this.ended || id !== this.turn) return;
    if (!this.speaking) {
      // Nothing was played (empty reply): listen again straight away.
      if (this.endAfterPlayback) return this.finish();
      return this.armSilence();
    }
    this.t.mark(`t${id}`);
  }

  private audioOut(id: number, pcm: Buffer) {
    if (this.ended || id !== this.turn || !pcm.length) return;
    if (this.timing.id === id && !this.timing.audio) {
      const t = (this.timing.audio = Date.now()) - this.timing.start;
      const w = this.timing.words ? this.timing.words - this.timing.start : -1;
      const s = this.timing.sentence ? this.timing.sentence - this.timing.start : -1;
      note(`turn ${id} timing: model's first words ${w} ms, first sentence ${s} ms, first audio ${t} ms after hearing the caller`);
    }
    this.speaking = true;
    this.t.sendAudio(pcm);
  }

  /** Speaks a fixed line (greeting, prompts), from cache when possible. */
  private async say(text: string, opts: { end?: boolean; cacheKey?: string } = {}) {
    if (this.ended) return;
    this.interrupt();
    const id = ++this.turn;
    if (opts.end) this.endAfterPlayback = true;
    this.log("agent", text);
    const cached = opts.cacheKey && greetingCache.get(opts.cacheKey);
    if (cached) {
      this.audioOut(id, cached);
      return this.afterSpeech(id);
    }
    const parts: Buffer[] = [];
    const out = await this.speaker
      .begin(this.lang, (pcm) => {
        parts.push(pcm);
        this.audioOut(id, pcm);
      })
      .catch((e: Error) => (note(`text-to-speech failed: ${e.message}`), null));
    if (!out) {
      if (opts.end) return this.finish();
      return;
    }
    out.say(text);
    out.end();
    await out.finished.catch(() => {});
    if (opts.cacheKey && parts.length && id === this.turn) greetingCache.set(opts.cacheKey, Buffer.concat(parts));
    this.afterSpeech(id);
  }

  private log(who: CallLine["who"], text: string) {
    this.transcript.push({ who, text, at: new Date().toISOString() });
    if (who === "agent") this.t.event?.({ type: "caption", who, text, final: true });
  }

  /** Lines spoken after registration are added to the stored complaint when the call ends. */
  private attachTranscript() {
    if (!this.registeredId || this.joinedExisting) return;
    const g = store.grievances.find(this.registeredId);
    if (!g) return;
    g.call = { transcript: this.transcript, language: this.local ?? this.lang, seconds: Math.round((Date.now() - this.startedAt) / 1000), via: this.via };
    store.grievances.save(g);
  }
}
