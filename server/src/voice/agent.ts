import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { departments, districts } from "../data/catalog.js";
import { store } from "../data/store.js";
import { claude, claudeEnabled } from "../lib/claude.js";
import { HttpError } from "../lib/httpError.js";
import * as grievances from "../services/grievance.service.js";
import { triageWithRules } from "../services/triage.service.js";
import type { CallLine } from "../types.js";
import { garhwaliEnabled, transcribeGarhwali } from "./garhwali.js";
import { duplicateMessage, duplicateSpoken, findDuplicate, joinDuplicate } from "../services/duplicate.service.js";
import { send } from "../services/whatsapp.service.js";
import { LINES, SYSTEM, confirmLine, emptySlots, mergeSlots, registeredLine, spokenNumber, splitReply, statusLine, takeSentences, turnMessage, type Action, type Slots } from "./prompt.js";
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
const SILENCE_MS = 9_000;
const greetingCache = new Map<string, Buffer>();
let activeCalls = 0;

export const callsInProgress = () => activeCalls;

/** District names help speech recognition with place names it would otherwise mishear. */
const KEYTERMS = [...districts.flatMap((d) => [d.name.hi, d.name.en]), "उत्तराखंड", "मुख्यमंत्री हेल्पलाइन", "जल संस्थान", "यूपीसीएल"];

export class CallAgent {
  private listener: Listener;
  private speaker: Speaker;
  private slots: Slots = emptySlots();
  private lang: Lang = "hi";
  private garhwali = false;
  private lastAction: Action | null = null;
  private history: Anthropic.MessageParam[] = [];
  private transcript: CallLine[] = [];
  private heard = "";
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
    this.speaker = new Speaker(t.sampleRate);
    this.speaker.warm();
    activeCalls += 1;

    this.listener.on("speechStart", () => {
      this.clearSilence();
      this.utteranceAt = Math.max(this.audioStart, this.audioStart + this.audioBytes - this.t.sampleRate); // ~0.5 s before
    });
    this.listener.on("partial", (text) => {
      this.clearSilence();
      // A real word or two, not line noise: the caller is talking over the agent.
      if (text.replace(/[\s.,।?!]/g, "").length >= 3 && (this.speaking || this.abort)) this.interrupt();
      this.t.event?.({ type: "caption", who: "citizen", text, final: false });
    });
    this.listener.on("final", (text) => void this.onFinal(text));
    this.listener.on("error", (msg) => {
      console.warn(`[voice] ${msg}`);
      this.t.event?.({ type: "error", message: "Speech recognition is unavailable" });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Call lifecycle                                                      */
  /* ------------------------------------------------------------------ */

  async start() {
    this.maxTimer = setTimeout(() => void this.say(LINES.timeUp[this.lang], { end: true }), MAX_CALL_MS);
    if (!claudeEnabled()) return this.say(LINES.sorry.hi, { end: true });
    await this.say(LINES.greeting.hi, { cacheKey: `greet:${this.t.sampleRate}` });
  }

  /** Caller audio from the line. */
  feed(pcm: Buffer) {
    if (this.ended) return;
    this.listener.feed(pcm);
    this.audio.push(pcm);
    this.audioBytes += pcm.length;
    const cap = this.t.sampleRate * 2 * 20;
    while (this.audioBytes > cap && this.audio.length > 1) {
      const dropped = this.audio.shift()!;
      this.audioBytes -= dropped.length;
      this.audioStart += dropped.length;
    }
  }

  /** Keypad: 1 Hindi, 2 Garhwali, 3 English. */
  dtmf(digit: string) {
    if (digit === "2") this.garhwali = true;
    if (digit === "1") (this.lang = "hi"), (this.garhwali = false);
    if (digit === "3") this.lang = "en";
  }

  /** The transport has played everything up to `name`. */
  played(name: string) {
    if (name !== `t${this.turn}`) return;
    this.speaking = false;
    if (this.endAfterPlayback) return this.finish();
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
  }

  /* ------------------------------------------------------------------ */
  /* Turns                                                               */
  /* ------------------------------------------------------------------ */

  private async onFinal(text: string) {
    if (this.ended || !text) return;
    this.silentPrompts = 0;
    this.log("citizen", text);
    this.t.event?.({ type: "caption", who: "citizen", text, final: true });
    // Several short finals in a row ("हाँ", "पौड़ी में") are answered together.
    this.heard = this.heard ? `${this.heard} ${text}` : text;
    if (/गढ़वाली|गढ़वळि|garhwali/i.test(text)) this.garhwali = true;

    let gbm: Promise<string | null> = Promise.resolve(null);
    if (this.garhwali && garhwaliEnabled()) {
      const from = Math.max(0, this.utteranceAt - this.audioStart);
      gbm = transcribeGarhwali(Buffer.concat(this.audio).subarray(from), this.t.sampleRate);
    }
    this.interrupt();
    await this.reply(await gbm);
  }

  private async reply(garhwaliText: string | null) {
    const heard = this.heard;
    const id = ++this.turn;
    const abort = new AbortController();
    this.abort = abort;
    const user: Anthropic.MessageParam = { role: "user", content: turnMessage(heard, this.slots, this.lastAction, garhwaliText) };
    const out = await this.speaker.begin(this.lang, (pcm) => this.audioOut(id, pcm)).catch(() => null);
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
        const cut = raw.indexOf("###");
        // Hold back a trailing "#" or "##" that may be the start of the separator.
        const speechSoFar = cut >= 0 ? raw.slice(0, cut) : raw.replace(/#{1,2}$/, "");
        pending += speechSoFar.slice(spokenUpTo);
        spokenUpTo = speechSoFar.length;
        const { ready, rest } = takeSentences(pending);
        pending = rest;
        for (const s of ready) out.say(s);
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      console.warn(`[voice] model failed${err instanceof Anthropic.APIError ? ` (${err.status})` : ""}`, err instanceof Error ? err.message : "");
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
      if (json.lang === "gbm") this.garhwali = true;
      if (json.lang === "en" || json.lang === "hi") this.lang = json.lang;
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
    this.lastAction = action === "register" && !this.registeredId ? (extra.readBack ? "confirm" : "ask") : action;
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
          lang: this.garhwali ? "gbm" : this.lang,
          call: { transcript: [...this.transcript], language: this.garhwali ? "gbm" : this.lang, seconds: Math.round((Date.now() - this.startedAt) / 1000), via: this.via },
        },
        "phone",
      );
      this.registeredId = g.id;
      this.t.event?.({ type: "registered", id: g.id });
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
      .catch(() => null);
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
    g.call = { transcript: this.transcript, language: this.garhwali ? "gbm" : this.lang, seconds: Math.round((Date.now() - this.startedAt) / 1000), via: this.via };
    store.grievances.save(g);
  }
}
