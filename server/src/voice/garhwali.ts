import { config } from "../config.js";

/*
 * Local (Pahari) languages on calls.
 *
 * Sarvam has no Garhwali or Kumaoni model. Meta's Omnilingual ASR (open source, Apache 2.0) has
 * Garhwali (gbm_Deva); it is hosted separately (garhwali-asr/ at the repository root). Kumaoni is not
 * in Omnilingual, so Kumaoni callers go through the Garhwali model too, the closest language it has.
 *
 * A call switches to the local model when the caller presses 2 (Garhwali) or 4 (Kumaoni), names the
 * language, uses clearly Garhwali or Kumaoni words (spotted here, instantly), or the language model
 * says so. From then on the local model's transcript leads and Sarvam's is a fallback; Sarvam still
 * runs underneath because it streams and knows when the caller has finished speaking.
 */

export type Pahari = "gbm" | "kfy";
export const garhwaliEnabled = () => Boolean(config.voice.garhwaliUrl);

/** Everyday words that Hindi does not use. Shared ones count for both languages. */
const WORDS: Record<Pahari, Set<string>> = {
  gbm: new Set("छौं छौ छां छन छयो छई कख कखि यख वख ह्वे ह्वेगे ह्वेगी ह्वेग्याई ग्याई मीथैं मिथैं तुमथैं हमथैं हमरु हमरू म्यारु म्यारू त्यारु तुमरु तुमरू क्वी कनु कनै किलै बाटु पाणी गौं जांदु औंदु ब्वाला ब्वलणा बोलणा अबि द्वी भौत नी".split(" ")),
  kfy: new Set("छु छुं छूं छ छै छन कां यां वां म्यर हमर तुमर त्यर भल भौत बाट पाणि गौं किलै इजा बौज्यू ठुल नान हैगो हैगे गोछ जाणौ आणौ नैं नै".split(" ")),
};
const NAMES: [RegExp, Pahari][] = [
  [/गढ़वाली|गढ़वळि|गढ़वाळी|garhwali/i, "gbm"],
  [/कुमाऊँनी|कुमाऊंनी|कुमाउनी|कुमैयां|kumaoni|kumauni/i, "kfy"],
];

/** Garhwali or Kumaoni if the transcript clearly is, else null. Two distinct local words are needed. */
export function detectPahari(text: string): Pahari | null {
  for (const [re, lang] of NAMES) if (re.test(text)) return lang;
  const tokens = new Set(text.split(/[\s.,।?!'"-]+/).filter(Boolean));
  const score = (l: Pahari) => [...tokens].filter((t) => WORDS[l].has(t)).length;
  const g = score("gbm");
  const k = score("kfy");
  if (Math.max(g, k) < 2) return null;
  return k > g ? "kfy" : "gbm";
}

/** A WhatsApp voice note (Ogg/Opus) or any audio file; the service converts it. Slower than a call turn is fine here. */
export async function transcribeGarhwaliFile(audio: Buffer, mime: string, timeoutMs = 20_000): Promise<string | null> {
  if (!garhwaliEnabled()) return null;
  try {
    const res = await fetch(`${config.voice.garhwaliUrl}/transcribe?lang=gbm_Deva`, {
      method: "POST",
      headers: { "content-type": (mime || "audio/ogg").split(";")[0].trim(), ...(config.voice.garhwaliToken ? { authorization: `Bearer ${config.voice.garhwaliToken}` } : {}) },
      body: new Uint8Array(audio),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { text?: string }).text?.trim() || null;
  } catch {
    return null;
  }
}

/** Wraps 16-bit mono PCM in a WAV header. */
export function wav(pcm: Buffer, rate: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Returns the Garhwali transcript, or null if the service is off, slow or failing. */
/** The model runs on a CPU, so a few seconds are allowed; on a timeout the call carries on with Sarvam's transcript. */
export async function transcribeGarhwali(pcm: Buffer, rate: number, timeoutMs = 5000): Promise<string | null> {
  if (!garhwaliEnabled() || pcm.length < rate * 2 * 0.3) return null;
  try {
    const res = await fetch(`${config.voice.garhwaliUrl}/transcribe?lang=gbm_Deva`, {
      method: "POST",
      headers: { "content-type": "audio/wav", ...(config.voice.garhwaliToken ? { authorization: `Bearer ${config.voice.garhwaliToken}` } : {}) },
      body: new Uint8Array(wav(pcm, rate)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { text?: string };
    return json.text?.trim() || null;
  } catch {
    return null;
  }
}
