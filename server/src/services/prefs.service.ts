import { db, ensureSchema, postgresEnabled } from "../lib/postgres.js";

/*
 * Each citizen's chosen language for WhatsApp and call updates: Hindi, English, Garhwali or Kumaoni.
 * Set on WhatsApp (LANGUAGE / भाषा) or by the language they use on a call. Kept in Postgres when it is
 * configured, so the choice survives restarts; otherwise in memory.
 */

export type ChatLang = "hi" | "en" | "gbm" | "kfy";
const prefs = new Map<string, ChatLang>();
let loaded: Promise<void> | undefined;

function load() {
  if (!postgresEnabled()) return Promise.resolve();
  return (loaded ??= ensureSchema()
    .then(() => db().query<{ mobile: string; lang: ChatLang }>("select mobile, lang from citizen_prefs"))
    .then((r) => r.rows.forEach((x) => prefs.set(x.mobile, x.lang)))
    .catch((err) => {
      loaded = undefined;
      console.warn(`Language preferences not loaded (${(err as Error).message})`);
    }));
}

export async function getLang(mobile: string): Promise<ChatLang | undefined> {
  await load();
  return prefs.get(mobile);
}

export async function setLang(mobile: string, lang: ChatLang) {
  await load();
  prefs.set(mobile, lang);
  if (postgresEnabled()) {
    await db()
      .query("insert into citizen_prefs (mobile, lang) values ($1, $2) on conflict (mobile) do update set lang = excluded.lang", [mobile, lang])
      .catch((err) => console.warn(`Language preference not saved (${(err as Error).message})`));
  }
}

/** Hindi templates serve Hindi, Garhwali and Kumaoni readers. */
export const readsHindi = (lang: ChatLang) => lang !== "en";
