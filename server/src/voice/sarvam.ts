import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { config } from "../config.js";

/*
 * Sarvam streaming speech, used by the phone agent.
 * - Listener: realtime speech-to-text (saaras:v4) with server-side turn detection and partial transcripts.
 * - Speaker: streaming text-to-speech (Bulbul) that returns raw 16-bit PCM at the call's sample rate.
 * Both take 8 kHz (phone line) or 16 kHz (browser) audio directly, so no resampling is needed.
 */

export const sarvamEnabled = () => Boolean(config.voice.sarvamKey);
const headers = () => ({ "api-subscription-key": config.voice.sarvamKey });

export type ListenerEvents = {
  speechStart: [];
  speechEnd: [];
  partial: [text: string];
  final: [text: string, language?: string];
  error: [message: string];
};

/** One realtime speech-to-text session for the length of a call. Reconnects if the socket drops. */
export class Listener extends EventEmitter<ListenerEvents> {
  private ws?: WebSocket;
  private queue: Buffer[] = [];
  private pending: Buffer = Buffer.alloc(0);
  private closed = false;
  private ping?: NodeJS.Timeout;
  private retries = 0;
  /** ~100 ms of audio per frame, as Sarvam recommends. */
  private readonly frameBytes: number;

  constructor(
    private readonly sampleRate: 8000 | 16000,
    private readonly keyterms: string[] = [],
  ) {
    super();
    this.frameBytes = (sampleRate / 10) * 2;
    this.open();
  }

  private open() {
    const q = new URLSearchParams({
      language_code: "auto",
      model: "saaras:v4",
      stream_type: "fast",
      encoding: "linear16",
      sample_rate: String(this.sampleRate),
      // Phone callers pause mid-sentence; 700 ms is snappy without cutting them off.
      silence_duration_ms: "700",
      // Phone lines carry traffic, wind and TV: a firmer threshold ignores them but still hears a soft "हाँ".
      min_speech_duration_ms: "300",
      threshold: "0.5",
    });
    if (this.keyterms.length) q.set("keyterms", JSON.stringify(this.keyterms.slice(0, 50).map((k) => k.slice(0, 64))));
    const ws = new WebSocket(`wss://api.sarvam.ai/speech-to-text-realtime/ws?${q}`, { headers: headers() });
    this.ws = ws;
    ws.on("open", () => {
      this.retries = 0;
      for (const f of this.queue.splice(0)) this.sendFrame(f);
      this.ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ event: "ping" })), 20_000);
    });
    ws.on("message", (raw) => {
      let m: { event?: string; text?: string; language?: string; message?: string; is_fatal?: boolean };
      try {
        m = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (m.event === "vad.speech_start") this.emit("speechStart");
      else if (m.event === "vad.speech_end") this.emit("speechEnd");
      else if (m.event === "transcript.partial" && m.text) this.emit("partial", m.text);
      else if (m.event === "transcript.final") this.emit("final", (m.text ?? "").trim(), m.language);
      else if (m.event === "error") this.emit("error", m.message ?? "speech-to-text error");
    });
    ws.on("unexpected-response", (_req, res) => this.emit("error", `speech-to-text rejected (${res.statusCode})`));
    ws.on("error", (err) => this.emit("error", err.message));
    ws.on("close", (code) => {
      clearInterval(this.ping);
      if (this.closed) return;
      // 1003 is a bad key or exhausted credit: retrying will not help.
      if (code === 1003 || code === 4000 || this.retries >= 3) return this.emit("error", `speech-to-text closed (${code})`);
      this.retries += 1;
      setTimeout(() => !this.closed && this.open(), 300 * this.retries);
    });
  }

  private sendFrame(frame: Buffer) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      // Keep at most ~3 s while (re)connecting.
      this.queue.push(frame);
      if (this.queue.length > 30) this.queue.shift();
      return;
    }
    this.ws.send(JSON.stringify({ event: "audio_input", audio: frame.toString("base64") }));
  }

  /** Raw 16-bit little-endian mono PCM at the listener's sample rate. */
  feed(pcm: Buffer) {
    if (this.closed) return;
    this.pending = this.pending.length ? Buffer.concat([this.pending, pcm]) : pcm;
    while (this.pending.length >= this.frameBytes) {
      this.sendFrame(this.pending.subarray(0, this.frameBytes));
      this.pending = this.pending.subarray(this.frameBytes);
    }
  }

  close() {
    this.closed = true;
    clearInterval(this.ping);
    try {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ event: "end" }));
      this.ws?.close();
    } catch {
      // Already closed.
    }
  }
}

type SpeakJob = { onAudio: (pcm: Buffer) => void; done: () => void; fail: (err: Error) => void };

/**
 * Streaming text-to-speech. One socket is reused for every reply in a call; an interruption
 * closes it (Sarvam has no cancel message) and the next reply opens a fresh one.
 */
export class Speaker {
  private ws?: WebSocket;
  private ready?: Promise<WebSocket>;
  private job?: SpeakJob;
  private lang = "";
  private ping?: NodeJS.Timeout;

  constructor(private readonly sampleRate: 8000 | 16000) {}

  private connect(): Promise<WebSocket> {
    if (this.ready && this.ws && this.ws.readyState <= WebSocket.OPEN) return this.ready;
    this.lang = "";
    const ws = new WebSocket("wss://api.sarvam.ai/text-to-speech/ws?model=bulbul:v4-flash&send_completion_event=true", { headers: headers() });
    this.ws = ws;
    this.ready = new Promise((resolve, reject) => {
      ws.once("open", () => resolve(ws));
      ws.once("error", reject);
      ws.once("unexpected-response", (_req, res) => reject(new Error(`text-to-speech rejected (${res.statusCode})`)));
    });
    ws.on("message", (raw) => {
      let m: { type?: string; data?: { audio?: string; event_type?: string; message?: string } };
      try {
        m = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (ws !== this.ws || !this.job) return;
      if (m.type === "audio" && m.data?.audio) this.job.onAudio(stripWavHeader(Buffer.from(m.data.audio, "base64")));
      else if (m.type === "event" && m.data?.event_type === "final") {
        const j = this.job;
        this.job = undefined;
        j.done();
      } else if (m.type === "error") {
        const j = this.job;
        this.job = undefined;
        j.fail(new Error(m.data?.message ?? "text-to-speech error"));
      }
    });
    ws.on("close", () => {
      clearInterval(this.ping);
      if (ws !== this.ws) return;
      this.ws = undefined;
      this.ready = undefined;
      const j = this.job;
      this.job = undefined;
      j?.fail(new Error("text-to-speech closed"));
    });
    ws.on("error", () => {});
    this.ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "ping" })), 25_000);
    return this.ready;
  }

  /** Opens the socket ahead of the first reply, so the greeting starts sooner. */
  warm() {
    this.connect().catch(() => {});
  }

  /**
   * Starts one reply. Push text with `say` as the language model streams it, then `end`.
   * Audio arrives through `onAudio`; the promise settles when the reply is fully synthesised.
   */
  async begin(lang: "hi" | "en", onAudio: (pcm: Buffer) => void) {
    const ws = await this.connect();
    if (this.lang !== lang) {
      ws.send(
        JSON.stringify({
          type: "config",
          data: {
            language_code: lang === "en" ? "en-IN" : "hi-IN",
            speaker: lang === "en" ? config.voice.speakerEn : config.voice.speakerHi,
            // Sarvam's recommended pace for conversational agents.
            pace: 1.0,
            speech_sample_rate: this.sampleRate,
            output_audio_codec: "linear16",
            // Start speaking after the first short phrase, not a whole paragraph.
            min_buffer_size: 30,
            max_chunk_length: 150,
          },
        }),
      );
      this.lang = lang;
    }
    let settle!: { done: () => void; fail: (e: Error) => void };
    const finished = new Promise<void>((done, fail) => (settle = { done, fail }));
    this.job = { onAudio, ...settle };
    let sent = false;
    return {
      say: (text: string) => {
        const t = text.trim();
        if (!t || ws !== this.ws || ws.readyState !== WebSocket.OPEN) return;
        sent = true;
        ws.send(JSON.stringify({ type: "text", data: { text: t } }));
      },
      end: () => {
        if (ws !== this.ws || ws.readyState !== WebSocket.OPEN) return;
        if (!sent) {
          this.job = undefined;
          settle.done();
          return;
        }
        ws.send(JSON.stringify({ type: "flush" }));
      },
      finished,
    };
  }

  /** Stops the current reply at once. */
  interrupt() {
    const ws = this.ws;
    const j = this.job;
    this.job = undefined;
    this.ws = undefined;
    this.ready = undefined;
    j?.done();
    try {
      ws?.close();
    } catch {
      // Already closed.
    }
  }

  close() {
    clearInterval(this.ping);
    this.interrupt();
  }
}

/** Sarvam's linear16 chunks are raw PCM, but drop a WAV header if one is ever present. */
function stripWavHeader(buf: Buffer) {
  if (buf.length > 44 && buf.toString("ascii", 0, 4) === "RIFF") {
    const data = buf.indexOf("data", 12, "ascii");
    if (data > 0) return buf.subarray(data + 8);
  }
  return buf;
}

/** Transcribes a WhatsApp voice note (OGG/Opus is accepted as is). */
export async function transcribeFile(audio: Buffer, mime: string): Promise<{ text: string; language?: string } | null> {
  if (!sarvamEnabled()) return null;
  const form = new FormData();
  // WhatsApp labels voice notes "audio/ogg; codecs=opus"; Sarvam accepts only the bare type.
  const type = (mime || "audio/ogg").split(";")[0].trim();
  form.append("file", new Blob([new Uint8Array(audio)], { type }), `voice.${type.split("/")[1] || "ogg"}`);
  form.append("model", "saaras:v4");
  const res = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: headers(), body: form, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Voice note transcription failed (${res.status})`);
  const json = (await res.json()) as { transcript?: string; language_code?: string | null };
  const text = (json.transcript ?? "").trim();
  return text ? { text, language: json.language_code ?? undefined } : null;
}

/** Languages Sarvam can speak; Devanagari hill languages and Nepali are read with the Hindi voice. */
const SPOKEN: Record<string, string> = { en: "en-IN", hi: "hi-IN", gbm: "hi-IN", kfy: "hi-IN", jns: "hi-IN", ne: "hi-IN", bn: "bn-IN", gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", pa: "pa-IN", ta: "ta-IN", te: "te-IN" };
export const sarvamSpeaks = (lang: string) => lang in SPOKEN;

/** A short reply read aloud on the website, as a WAV file. */
export async function speakFile(text: string, lang: string, narrator = false): Promise<Buffer> {
  const code = SPOKEN[lang];
  if (!sarvamEnabled() || !code) throw new Error("Sarvam cannot speak this language");
  // Hindi and English have Sarvam's newest voices; the other languages use its multilingual default.
  const persona = code === "hi-IN" ? (narrator ? "ratan_hi_customer_expressive" : config.voice.speakerHi) : code === "en-IN" ? (narrator ? "simran_en_customer" : config.voice.speakerEn) : null;
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ text, target_language_code: code, speech_sample_rate: 22050, pace: 1.0, ...(persona ? { model: "bulbul:v4-flash", speaker: persona } : { model: "bulbul:v3" }) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Sarvam speech failed (${res.status})`);
  const json = (await res.json()) as { audios?: string[] };
  if (!json.audios?.[0]) throw new Error("Sarvam returned no audio");
  return Buffer.from(json.audios[0], "base64");
}
