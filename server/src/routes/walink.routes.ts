import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import QRCode from "qrcode";
import { config } from "../config.js";
import { waLinkCode, waLinkQr, waLinkStatus } from "../services/walink.service.js";

/*
 * Private page for linking the WhatsApp number: /api/whatsapp/link?key=<PHONE_STREAM_SECRET>
 * Shows the live QR (refreshing on its own) to scan from WhatsApp → Linked devices → Link a device,
 * or a pairing code on request. Anyone with this page could link the number, so it needs the key.
 */

const limiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });
const secret = () => process.env.WA_LINK_SECRET || config.voice.streamSecret;
const allowed = (key: unknown) => {
  const want = secret();
  if (!want || typeof key !== "string" || key.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(want));
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const page = (body: string, refresh?: number) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
${refresh ? `<meta http-equiv="refresh" content="${refresh}">` : ""}<title>Link WhatsApp</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#f4f6fa;color:#142033}main{max-width:30rem;margin:0 auto;padding:24px 16px}
.card{background:#fff;border:1px solid #d3dbe7;border-radius:14px;padding:20px}h1{font-size:1.25rem;margin:0 0 8px}svg{width:100%;height:auto;display:block;margin:12px 0}
.code{font:700 2rem/1.2 ui-monospace,monospace;letter-spacing:.12em;text-align:center;margin:16px 0}ol{padding-left:1.2em}.ok{color:#0e7a45}.muted{color:#4a5870;font-size:.9rem}a{color:#1450a8}</style>
</head><body><main><div class="card">${body}</div></main></body></html>`;

export const waLinkRoutes = Router().get("/link", limiter, async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!config.waLink.enabled) return res.status(404).send(page("<h1>WhatsApp link is off</h1><p>Set WA_LINK=on on the server.</p>"));
  if (!allowed(req.query.key)) return res.status(404).send(page("<h1>Not found</h1>"));
  const key = encodeURIComponent(String(req.query.key));
  const st = waLinkStatus();

  if (st.state === "open") return res.send(page(`<h1 class="ok">✅ WhatsApp is linked</h1><p>Number ${esc(st.number ?? "")}. The bot answers every message and sends complaint updates.</p>`));

  if (req.query.code) {
    try {
      const code = await waLinkCode();
      return res.send(
        page(`<h1>Link with a code</h1><div class="code">${esc(code)}</div>
<ol><li>On the phone with ${esc(st.number ?? "the bot number")}: WhatsApp → Settings → <b>Linked devices</b> → <b>Link a device</b>.</li>
<li>Tap <b>Link with phone number instead</b> and type the code within a minute.</li></ol>
<p class="muted">Each new code cancels the last one, so type this one. <a href="?key=${key}">Back to the QR</a> · <a href="?key=${key}&code=1">Get another code</a></p>`),
      );
    } catch (err) {
      return res.send(page(`<h1>Could not get a code</h1><p>${esc((err as Error).message)}</p><p><a href="?key=${key}">Use the QR instead</a></p>`, 10));
    }
  }

  const qr = waLinkQr();
  if (!qr) return res.send(page(`<h1>Connecting to WhatsApp…</h1><p class="muted">This page refreshes by itself. State: ${esc(st.state)}${st.error ? `, ${esc(st.error)}` : ""}</p>`, 3));
  const svg = await QRCode.toString(qr.value, { type: "svg", margin: 1, errorCorrectionLevel: "L" });
  res.send(
    page(
      `<h1>Scan to link WhatsApp</h1>${svg}
<ol><li>On the bot phone: WhatsApp → Settings → <b>Linked devices</b> → <b>Link a device</b>.</li><li>Point the camera at this QR. It refreshes by itself.</li></ol>
<p class="muted">Can't scan? <a href="?key=${key}&code=1">Link with a code instead</a></p>`,
      15,
    ),
  );
});
