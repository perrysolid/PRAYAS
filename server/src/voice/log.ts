/** The last few phone-line events, for /api/phone/debug: what Exotel sent and what the agent did. */
const recent: { at: string; what: string }[] = [];
export const phoneLog = () => recent;
export function note(what: string) {
  recent.push({ at: new Date().toISOString(), what });
  if (recent.length > 60) recent.shift();
  console.log(`[phone] ${what}`);
}
