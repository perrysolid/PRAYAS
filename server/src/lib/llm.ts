import { config } from "../config.js";

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
type Content = { role: "user" | "model"; parts: Part[] };

export const aiEnabled = () => Boolean(config.ai.key && config.ai.model);
export const ttsEnabled = () => Boolean(config.ai.key && config.ai.ttsModel);

async function post(model: string, body: unknown, timeoutMs: number) {
  const res = await fetch(`${config.ai.endpoint}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": config.ai.key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`Language model error ${res.status}: ${json.error?.message ?? "unknown"}`);
  if (json.promptFeedback?.blockReason) throw new Error(`Blocked: ${json.promptFeedback.blockReason}`);
  return json.candidates?.[0]?.content?.parts ?? [];
}

/**
 * Ask the language model for JSON matching `schema`. Citizen text always goes in `contents`,
 * never in `system`, so it is treated as data and cannot rewrite the instructions.
 */
export async function generateJson<T>(opts: { system: string; contents: Content[]; schema: object; model?: string; temperature?: number; timeoutMs?: number }): Promise<T> {
  const parts = await post(
    opts.model ?? config.ai.model,
    {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: opts.contents,
      generationConfig: { temperature: opts.temperature ?? 0.2, responseMimeType: "application/json", responseSchema: opts.schema, maxOutputTokens: 2048 },
      safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map((category) => ({ category, threshold: "BLOCK_MEDIUM_AND_ABOVE" })),
    },
    opts.timeoutMs ?? 20_000,
  );
  const text = parts.map((p) => p.text ?? "").join("");
  return JSON.parse(text) as T;
}

/** Natural speech for `text`. Returns WAV audio. */
export async function synthesize(text: string, style: string, voice = "Kore"): Promise<Buffer> {
  const parts = await post(
    config.ai.ttsModel,
    {
      contents: [{ role: "user", parts: [{ text: `${style}\n\n${text}` }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    },
    30_000,
  );
  const audio = parts.find((p) => p.inlineData)?.inlineData;
  if (!audio) throw new Error("No audio returned");
  const data = Buffer.from(audio.data, "base64");
  return audio.mimeType.includes("wav") ? data : pcmToWav(data, Number(audio.mimeType.match(/rate=(\d+)/)?.[1] ?? 24000));
}

/** Wraps raw 16-bit mono PCM in a WAV header so browsers can play it. */
function pcmToWav(pcm: Buffer, rate: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
