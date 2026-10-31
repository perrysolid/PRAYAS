import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { forbidden } from "../lib/httpError.js";
import { store } from "../data/store.js";
import * as wa from "../services/whatsapp.service.js";

/** Numbers anyone may use in the demo phone. Other numbers need that citizen to be signed in. */
const DEMO_MOBILES = ["9876543210", "9876500001"];

function allowedMobile(req: Request, mobile: string) {
  const s = req.session;
  if (s?.role === "citizen" && s.mobile === mobile) return;
  if (config.showDemoOtp && DEMO_MOBILES.includes(mobile)) return;
  throw forbidden("Sign in with this mobile number to see its WhatsApp messages");
}

export function status(_req: Request, res: Response) {
  res.json({ ...wa.whatsappStatus(), demoMobiles: config.showDemoOtp ? DEMO_MOBILES : [] });
}

export function thread(req: Request, res: Response) {
  const mobile = String(req.query.mobile);
  allowedMobile(req, mobile);
  res.json(store.whatsapp.thread(mobile));
}

export function inbound(req: Request, res: Response, next: NextFunction) {
  allowedMobile(req, req.body.mobile);
  wa.handleInbound(req.body.mobile, req.body.text).then(() => res.json({ ok: true }), next);
}

/** Meta calls this once to confirm the webhook URL. */
export function verify(req: Request, res: Response) {
  const ok = req.query["hub.mode"] === "subscribe" && config.whatsapp.verifyToken && req.query["hub.verify_token"] === config.whatsapp.verifyToken;
  if (!ok) return res.sendStatus(403);
  res.status(200).send(String(req.query["hub.challenge"] ?? ""));
}

export function webhook(req: Request & { rawBody?: Buffer }, res: Response) {
  if (!wa.verifySignature(req.rawBody, req.get("x-hub-signature-256"))) return res.sendStatus(401);
  // Acknowledge at once; Meta retries slow webhooks.
  res.sendStatus(200);
  wa.handleWebhook(req.body);
}
