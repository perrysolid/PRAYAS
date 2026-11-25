import { config } from "../config.js";

/*
 * Garhwali speech recognition through Meta's Omnilingual ASR (open source, Apache 2.0), hosted
 * separately (see garhwali-asr/ at the repository root). Sarvam has no Garhwali model, so once a
 * caller is speaking Garhwali, each of their turns is also sent here and the agent reads both.
 */

export const garhwaliEnabled = () => Boolean(config.voice.garhwaliUrl);

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
export async function transcribeGarhwali(pcm: Buffer, rate: number, timeoutMs = 3500): Promise<string | null> {
  if (!garhwaliEnabled() || pcm.length < rate * 2 * 0.3) return null;
  try {
    const res = await fetch(`${config.voice.garhwaliUrl}/transcribe`, {
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
