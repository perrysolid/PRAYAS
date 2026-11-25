import type { IncomingMessage, Server } from "node:http";
import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import WebSocket, { WebSocketServer } from "ws";
import { config } from "../config.js";
import { claudeEnabled } from "../lib/claude.js";
import { CallAgent, callsInProgress, type Transport } from "./agent.js";
import { sarvamEnabled } from "./sarvam.js";

/*
 * Audio transports for the phone agent, on the same server as the API:
 *
 * /api/phone/exotel   Exotel Voicebot applet (bidirectional stream). Point the applet at
 *                     wss://<api-host>/api/phone/exotel/<PHONE_STREAM_SECRET>
 *                     (Exotel drops query strings, so the secret goes in the path.)
 *                     Messages are JSON: connected, start, media (base64 16-bit PCM), dtmf, mark, stop.
 * /api/phone/browser  Practice call from the website: binary 16 kHz PCM both ways plus JSON events.
 */

export const voiceReady = () => sarvamEnabled() && claudeEnabled();

/** The last few phone-line events, for /api/phone/debug: shows whether Exotel reached us and what it sent. */
const recent: { at: string; what: string }[] = [];
export const phoneLog = () => recent;
export function note(what: string) {
  recent.push({ at: new Date().toISOString(), what });
  if (recent.length > 40) recent.shift();
  console.log(`[phone] ${what}`);
}


const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const secretMatches = (given: string) => {
  const want = config.voice.streamSecret;
  return Boolean(want && given) && same(given, want);
};

function exotelAllowed(req: IncomingMessage, url: URL) {
  const want = config.voice.streamSecret;
  if (!want) return !config.isProd; // open only in local development
  // Exotel drops the query string, so the secret can also be the last part of the path.
  const fromPath = url.pathname.startsWith("/api/phone/exotel/") ? decodeURIComponent(url.pathname.slice("/api/phone/exotel/".length)) : "";
  if (fromPath && same(fromPath, want)) return true;
  const given = url.searchParams.get("secret") ?? "";
  if (given && same(given, want)) return true;
  const auth = req.headers.authorization ?? "";
  if (auth.toLowerCase().startsWith("basic ")) {
    const pass = Buffer.from(auth.slice(6), "base64").toString().split(":").slice(1).join(":");
    return Boolean(pass) && same(pass, want);
  }
  return false;
}

/** Short-lived token for one practice call, tied to a mobile number. */
export function callToken(mobile: string) {
  return jwt.sign({ scope: "call", mobile }, config.jwtSecret, { expiresIn: 600 });
}

function browserMobile(url: URL): string | null {
  try {
    const p = jwt.verify(url.searchParams.get("token") ?? "", config.jwtSecret) as { scope?: string; mobile?: string };
    return p.scope === "call" && p.mobile && /^\d{10}$/.test(p.mobile) ? p.mobile : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Exotel                                                              */
/* ------------------------------------------------------------------ */

function exotel(ws: WebSocket) {
  let agent: CallAgent | undefined;
  let sid = "";
  let outBuf: Buffer = Buffer.alloc(0);
  let chunk = 3200;
  const send = (event: string, body: Record<string, unknown> = {}) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event, stream_sid: sid, ...body }));
  };
  const flush = (final: boolean) => {
    // Exotel wants chunks of at least 3.2 KB, in multiples of 320 bytes.
    while (outBuf.length >= chunk) {
      send("media", { media: { payload: outBuf.subarray(0, chunk).toString("base64") } });
      outBuf = outBuf.subarray(chunk);
    }
    if (final && outBuf.length) {
      send("media", { media: { payload: Buffer.concat([outBuf, Buffer.alloc(chunk - outBuf.length)]).toString("base64") } });
      outBuf = Buffer.alloc(0);
    }
  };
  const idle = setTimeout(() => {
    note("Exotel connected but sent no start event within 10 s; closing");
    ws.close(1008);
  }, 10_000);
  let media = 0;

  ws.on("message", (raw, isBinary) => {
    if (isBinary) return;
    let m: { event?: string; start?: Record<string, unknown>; media?: { payload?: string }; dtmf?: { digit?: string }; mark?: { name?: string }; stream_sid?: string };
    try {
      m = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (m.event && m.event !== "media") note(`Exotel event: ${m.event}${m.event === "start" ? ` (start keys: ${Object.keys(m.start ?? {}).join(",")}; format ${JSON.stringify((m.start as { media_format?: unknown } | undefined)?.media_format ?? null)})` : ""}`);
    if (m.event === "media" && ++media === 1) note("Exotel: first caller audio received");
    if (m.event === "start" && !agent) {
      clearTimeout(idle);
      const s = m.start ?? {};
      sid = String(s.stream_sid ?? s.streamSid ?? m.stream_sid ?? "");
      const rate = Number((s.media_format as { sample_rate?: number } | undefined)?.sample_rate) === 16000 ? 16000 : 8000;
      chunk = rate === 16000 ? 6400 : 3200;
      const from = String(s.from ?? "").replace(/\D/g, "").slice(-10);
      if (!/^\d{10}$/.test(from)) {
        note(`Exotel call without a usable caller number (from=${JSON.stringify(String(s.from ?? "")).slice(0, 20)}); ending`);
        return ws.close(1008);
      }
      console.log(`[phone] Exotel call ${sid.slice(-6)} from ${from.slice(0, 2)}••••${from.slice(-2)} at ${rate} Hz`);
      const t: Transport = {
        sampleRate: rate,
        sendAudio: (pcm) => {
          outBuf = Buffer.concat([outBuf, pcm]);
          flush(false);
        },
        mark: (name) => {
          flush(true);
          send("mark", { mark: { name } });
        },
        clear: () => {
          outBuf = Buffer.alloc(0);
          send("clear");
        },
        hangup: () => setTimeout(() => ws.close(1000), 300),
      };
      agent = new CallAgent(t, from, "exotel");
      void agent.start();
    } else if (m.event === "media" && agent && m.media?.payload) agent.feed(Buffer.from(m.media.payload, "base64"));
    else if (m.event === "dtmf" && m.dtmf?.digit) agent?.dtmf(String(m.dtmf.digit));
    else if (m.event === "mark" && m.mark?.name) agent?.played(m.mark.name);
    else if (m.event === "stop") ws.close(1000);
  });
  ws.on("close", (code) => {
    clearTimeout(idle);
    note(`Exotel stream closed (${code}) after ${media} audio frames`);
    agent?.stop();
  });
  ws.on("error", () => {});
}

/* ------------------------------------------------------------------ */
/* Browser practice call                                               */
/* ------------------------------------------------------------------ */

function browser(ws: WebSocket, mobile: string) {
  const json = (e: Record<string, unknown>) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(e));
  const t: Transport = {
    sampleRate: 16000,
    sendAudio: (pcm) => ws.readyState === WebSocket.OPEN && ws.send(pcm, { binary: true }),
    mark: (name) => json({ type: "mark", name }),
    clear: () => json({ type: "clear" }),
    hangup: () => {
      json({ type: "hangup" });
      setTimeout(() => ws.close(1000), 1500);
    },
    event: json,
  };
  const agent = new CallAgent(t, mobile, "browser");
  json({ type: "ready" });
  void agent.start();
  ws.on("message", (raw, isBinary) => {
    if (isBinary) return agent.feed(Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer));
    try {
      const m = JSON.parse(raw.toString()) as { type?: string; name?: string; digit?: string };
      if (m.type === "played" && m.name) agent.played(m.name);
      else if (m.type === "dtmf" && m.digit) agent.dtmf(m.digit);
      else if (m.type === "hangup") ws.close(1000);
    } catch {
      // Ignore malformed control messages.
    }
  });
  ws.on("close", () => agent.stop());
  ws.on("error", () => {});
}

/** Accepts phone and practice-call WebSockets on the API's HTTP server. */
export function attachPhone(server: Server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const reject = (code: number, why: string) => {
      socket.write(`HTTP/1.1 ${code} ${why}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    const isExotel = url.pathname === "/api/phone/exotel" || url.pathname.startsWith("/api/phone/exotel/");
    if (isExotel) note(`WebSocket from ${req.headers["user-agent"]?.slice(0, 40) ?? "?"}; secret in path ${url.pathname.length > "/api/phone/exotel/".length ? "yes" : "no"}; query keys [${[...url.searchParams.keys()].join(",")}]; basic auth ${req.headers.authorization ? "yes" : "no"}`);
    if (!isExotel && url.pathname !== "/api/phone/browser") return reject(404, "Not Found");
    if (!voiceReady()) {
      if (isExotel) note("rejected: phone agent off (SARVAM_API_KEY or ANTHROPIC_API_KEY missing)");
      return reject(503, "Service Unavailable");
    }
    if (callsInProgress() >= config.voice.maxCalls) return reject(503, "Service Unavailable");

    if (isExotel) {
      if (!exotelAllowed(req, url)) {
        note("rejected: wrong or missing secret");
        return reject(401, "Unauthorized");
      }
      return wss.handleUpgrade(req, socket, head, (ws) => exotel(ws));
    }

    const origin = req.headers.origin ?? "";
    if (origin && !config.corsOrigins.includes(origin)) return reject(403, "Forbidden");
    const mobile = browserMobile(url);
    if (!mobile) return reject(401, "Unauthorized");
    wss.handleUpgrade(req, socket, head, (ws) => browser(ws, mobile));
  });
}
