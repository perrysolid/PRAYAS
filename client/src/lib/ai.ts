import { api, type AiStatus } from "./api";

let status: Promise<AiStatus> | undefined;

/** Whether the server has a language model configured. Asked once per page load. */
export function aiStatus() {
  status ??= api.aiStatus().catch(() => ({ enabled: false, speech: false }));
  return status;
}

const cache = new Map<string, string>();

/** Translate interface strings from English, with a per-session cache. Untranslated strings come back unchanged. */
export async function translateStrings(strings: string[], locale: string): Promise<string[]> {
  if (locale === "en") return strings;
  const key = (s: string) => `${locale}\u0000${s}`;
  const missing = [...new Set(strings.filter((s) => !cache.has(key(s))))];
  for (let i = 0; i < missing.length; i += 150) {
    const batch = missing.slice(i, i + 150);
    try {
      const { items } = await api.translate(batch, locale);
      batch.forEach((s, j) => cache.set(key(s), items[j] ?? s));
    } catch {
      break;
    }
  }
  return strings.map((s) => cache.get(key(s)) ?? s);
}
