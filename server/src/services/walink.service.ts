import fs from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pino } from "pino";
import { config } from "../config.js";
import { pgKv, postgresEnabled } from "../lib/postgres.js";
import { handleInbound, handleInboundLocation, handleInboundPhoto, handleVoiceNote, useLinkedSender } from "./whatsapp.service.js";

/*
 * WhatsApp on an ordinary number, without a Meta Business account: the server links to the number
 * as a linked device (like WhatsApp Web), answers everyone who writes, and sends complaint updates.
 *
 * Set WA_LINK=on and WA_LINK_NUMBER=91XXXXXXXXXX. Until the number is linked, the server log prints
 * a pairing code: on the phone, WhatsApp → Settings → Linked devices → Link a device →
 * "Link with phone number instead", and type the code. The login is kept in Postgres (table wa_auth),
 * Supabase, or .data/wa-auth locally, so restarts reconnect on their own.
 *
 * This is an unofficial client: WhatsApp can restrict numbers that run bots, so use a spare SIM.
 * Production would use the WhatsApp Business (Cloud) API, which this server also supports.
 */

type Baileys = typeof import("@whiskeysockets/baileys");
type Socket = ReturnType<Baileys["default"]>;

export type LinkStatus = { state: "off" | "starting" | "waiting" | "pairing" | "open" | "logged_out"; number?: string; since: string; error?: string };

const link: { sock?: Socket; status: LinkStatus; stopped?: boolean; qr?: { value: string; at: number }; code?: { value: string; at: number } } = { status: { state: "off", since: new Date().toISOString() } };
const set = (s: Partial<LinkStatus> & Pick<LinkStatus, "state">) => (link.status = { ...link.status, error: undefined, ...s, since: new Date().toISOString() });

export const waLinkStatus = () => ({ ...link.status, number: link.status.number ? `${link.status.number.slice(0, 4)}••••${link.status.number.slice(-2)}` : undefined });
const ready = () => link.status.state === "open" && Boolean(link.sock);
const pairNumber = () => {
  const d = config.waLink.number;
  return d.length === 10 ? `91${d}` : d || undefined;
};

/** For the linking page: the live QR, or a pairing code requested on demand. */
export const waLinkQr = () => (link.status.state === "open" ? undefined : link.qr);
export async function waLinkCode(): Promise<string> {
  const number = pairNumber();
  if (!number) throw new Error("Set WA_LINK_NUMBER (with 91) to link with a code");
  if (!link.sock || link.status.state === "open") throw new Error("Not waiting to be linked");
  // One code at a time: each new request cancels the previous one, so reuse a fresh code.
  if (link.code && Date.now() - link.code.at < 50_000) return link.code.value;
  const value = (await link.sock.requestPairingCode(number)).match(/.{1,4}/g)!.join("-");
  link.code = { value, at: Date.now() };
  set({ state: "pairing", number });
  return value;
}

/* ------------------------------------------------------------------ */
/* Login storage: one row per key, the layout of Baileys' file store   */
/* ------------------------------------------------------------------ */

let db: SupabaseClient | undefined;
const remote = () => (!postgresEnabled() && config.supabase.url && config.supabase.serviceKey ? (db ??= createClient(config.supabase.url, config.supabase.serviceKey, { auth: { persistSession: false } })) : undefined);
const DIR = path.join(process.cwd(), ".data", "wa-auth");
const file = (key: string) => path.join(DIR, `${key.replace(/[/:]/g, "_")}.json`);

const fileKv = {
  async get(key: string): Promise<string | undefined> {
    const r = remote();
    if (r) {
      const { data, error } = await r.from("wa_auth").select("value").eq("key", key).maybeSingle();
      if (error) throw new Error(`wa_auth: ${error.message}`);
      return (data as { value: string } | null)?.value;
    }
    return fs.readFile(file(key), "utf8").catch(() => undefined);
  },
  async set(key: string, value: string) {
    const r = remote();
    if (r) {
      const { error } = await r.from("wa_auth").upsert({ key, value });
      if (error) throw new Error(`wa_auth: ${error.message}`);
      return;
    }
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(file(key), value);
  },
  async del(key: string) {
    const r = remote();
    if (r) await r.from("wa_auth").delete().eq("key", key);
    else await fs.rm(file(key), { force: true });
  },
  async clear() {
    const r = remote();
    if (r) await r.from("wa_auth").delete().neq("key", "");
    else await fs.rm(DIR, { recursive: true, force: true });
  },
};

const kv = { get: (k: string) => (postgresEnabled() ? pgKv.get(k) : fileKv.get(k)), set: (k: string, v: string) => (postgresEnabled() ? pgKv.set(k, v) : fileKv.set(k, v)), del: (k: string) => (postgresEnabled() ? pgKv.del(k) : fileKv.del(k)), clear: () => (postgresEnabled() ? pgKv.clear() : fileKv.clear()) };

async function authState(b: Baileys) {
  const read = async (key: string) => {
    const v = await kv.get(key);
    return v ? JSON.parse(v, b.BufferJSON.reviver) : null;
  };
  const write = (key: string, data: unknown) => kv.set(key, JSON.stringify(data, b.BufferJSON.replacer));
  const creds = (await read("creds")) ?? b.initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const out: Record<string, unknown> = {};
          await Promise.all(
            ids.map(async (id) => {
              let v = await read(`${type}-${id}`);
              if (type === "app-state-sync-key" && v) v = b.proto.Message.AppStateSyncKeyData.fromObject(v);
              out[id] = v;
            }),
          );
          return out;
        },
        set: async (data: Record<string, Record<string, unknown>>) => {
          const jobs: Promise<unknown>[] = [];
          for (const type in data) for (const id in data[type]) jobs.push(data[type][id] ? write(`${type}-${id}`, data[type][id]) : kv.del(`${type}-${id}`));
          await Promise.all(jobs);
        },
      },
    },
    saveCreds: () => write("creds", creds),
  };
}

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

/** Starts (or restarts) the link. A failed start, e.g. the database briefly unreachable, is retried. */
export async function startWaLink(): Promise<void> {
  if (!config.waLink.enabled) return;
  try {
    await connect();
  } catch (err) {
    console.warn(`[wa-link] could not start (${(err as Error).message}); retrying in 30 s`);
    set({ state: "starting", error: (err as Error).message });
    setTimeout(() => void startWaLink(), 30_000);
  }
}

async function connect() {
  if (link.stopped) return;
  const b = await import("@whiskeysockets/baileys");
  const { state, saveCreds } = await authState(b);
  set({ state: "starting", number: state.creds.me?.id?.split(":")[0] });
  const logger = pino({ level: "silent" });
  const sock = b.default({
    // Keys are cached in memory so each message does not wait on a database round trip.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auth: { creds: state.creds, keys: b.makeCacheableSignalKeyStore(state.keys as any, logger) },
    logger,
    browser: b.Browsers.macOS("Chrome"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  link.sock = sock;
  sock.ev.on("creds.update", () => void saveCreds());

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr && link.sock === sock) {
      // WhatsApp rotates the QR every ~20 s; the linking page always shows the latest one.
      link.qr = { value: qr, at: Date.now() };
      if (link.status.state !== "pairing") {
        set({ state: "waiting" });
        console.log(`[wa-link] not linked yet: open ${config.publicUrl || "<api>"}/api/whatsapp/link?key=<PHONE_STREAM_SECRET> and scan the QR (WhatsApp → Linked devices → Link a device)`);
      }
    }
    if (connection === "open") {
      link.qr = undefined;
      set({ state: "open", number: sock.user?.id?.split(":")[0] });
      console.log(`[wa-link] linked as ${link.status.number?.slice(0, 4)}••••, answering every message`);
    }
    if (connection === "close") {
      if (link.sock !== sock) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (lastDisconnect?.error as any)?.output?.statusCode;
      if (code === b.DisconnectReason.loggedOut) {
        await kv.clear().catch(() => {});
        set({ state: "logged_out", number: undefined });
        console.warn("[wa-link] logged out from the phone; open the linking page to link again");
        setTimeout(() => void startWaLink(), 2_000);
        return;
      }
      if (code === b.DisconnectReason.connectionReplaced) {
        // Another server instance (a deploy rolling over) holds the link now.
        console.warn("[wa-link] link taken over by another instance; this one stops");
        link.stopped = true;
        set({ state: "off" });
        return;
      }
      // Keep the login: right after linking WhatsApp asks for a restart (515), and an unfinished
      // link is resumed with the same keys so a code already shown stays valid.
      if (state.creds.me) console.warn(`[wa-link] connection closed (${code ?? "network"}), reconnecting`);
      setTimeout(() => void startWaLink(), code === b.DisconnectReason.restartRequired ? 0 : 3_000);
    }
  });

  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) void handle(sock, b, m).catch((err) => console.warn(`[wa-link] ${(err as Error).message}`));
  });
}

/** A phone number from a WhatsApp id; newer chats may use a private "@lid" id, with the number alongside. */
const phoneOf = (...jids: (string | null | undefined)[]) => jids.find((j) => j?.endsWith("@s.whatsapp.net"))?.split("@")[0].split(":")[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handle(sock: Socket, b: Baileys, m: any) {
  const jid: string | undefined = m.key.remoteJid;
  if (m.key.fromMe || !jid || jid.endsWith("@g.us") || jid === "status@broadcast" || jid.endsWith("@newsletter") || !m.message) return;
  const phone = phoneOf(jid, m.key.remoteJidAlt, m.key.senderPn);
  // Complaints are tied to an Indian mobile number.
  const mobile = phone?.startsWith("91") && phone.length === 12 ? phone.slice(2) : undefined;
  if (!mobile) {
    await sock.sendMessage(jid, { text: "CM Helpline serves Indian mobile numbers. Please call 080 4729 1964." }).catch(() => {});
    return;
  }
  const x = m.message;
  const name = (m.pushName as string | undefined)?.trim() || undefined;
  await sock.readMessages([m.key]).catch(() => {});
  await sock.sendPresenceUpdate("composing", jid).catch(() => {});
  try {
    if (x.imageMessage) {
      const data = (await b.downloadMediaMessage(m, "buffer", {})) as Buffer;
      return await handleInboundPhoto(mobile, data, x.imageMessage.mimetype ?? "image/jpeg", (x.imageMessage.caption ?? "").trim(), name);
    }
    const loc = x.locationMessage ?? x.liveLocationMessage;
    if (loc && typeof loc.degreesLatitude === "number" && typeof loc.degreesLongitude === "number") {
      return await handleInboundLocation(mobile, loc.degreesLatitude, loc.degreesLongitude);
    }
    const text: string = (x.conversation ?? x.extendedTextMessage?.text ?? "").trim();
    if (text) return await handleInbound(mobile, text, name);
    if (x.audioMessage) {
      const data = (await b.downloadMediaMessage(m, "buffer", {})) as Buffer;
      return await handleVoiceNote(mobile, data, x.audioMessage.mimetype ?? "audio/ogg", name);
    }
    await sock.sendMessage(jid, { text: "मैं लिखे संदेश, वॉइस नोट और फ़ोटो समझ सकती हूँ। अपनी समस्या लिखें या बोलकर भेजें।\nI can read text, voice notes and photos. Please describe your problem." });
  } finally {
    await sock.sendPresenceUpdate("paused", jid).catch(() => {});
  }
}

useLinkedSender({
  ready,
  async send(mobile, text, image) {
    if (!ready()) throw new Error("WhatsApp link is not connected");
    const jid = `91${mobile.replace(/\D/g, "").slice(-10)}@s.whatsapp.net`;
    if (image) {
      try {
        await link.sock!.sendMessage(jid, { image, caption: text });
        return;
      } catch {
        // Photo could not be sent: send the words alone.
      }
    }
    await link.sock!.sendMessage(jid, { text });
  },
});
