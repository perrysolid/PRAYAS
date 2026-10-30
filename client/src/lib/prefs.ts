// Per-device preferences. Storage can be unavailable (private mode), so every access is guarded.
const KEY = "cmh1905.prefs";

function readAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export const readPref = (name: string): string | undefined => readAll()[name];

export function writePref(name: string, value: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [name]: value }));
  } catch {
    // Preference simply won't persist.
  }
}
