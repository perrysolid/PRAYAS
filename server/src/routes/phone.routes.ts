import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { HttpError, unauthorized } from "../lib/httpError.js";
import { garhwaliEnabled } from "../voice/garhwali.js";
import { callToken, voiceReady } from "../voice/phone.js";

const callLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 6, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Too many practice calls. Try again in a few minutes." } } });

/** Demo number anyone may use for a practice call on the hosted prototype. */
const DEMO_MOBILE = "9876543210";

export const phoneRoutes = Router()
  .get("/status", (_req, res) => {
    res.json({ available: voiceReady(), garhwali: garhwaliEnabled(), number: process.env.HELPLINE_PHONE_NUMBER || null });
  })
  /** A practice call is registered to the signed-in citizen's mobile, or to the demo mobile. */
  .post("/browser-token", callLimiter, (req, res, next) => {
    if (!voiceReady()) return next(new HttpError(503, "VOICE_UNAVAILABLE", "The voice agent is not switched on right now. Call 1905 or use WhatsApp."));
    const s = req.session;
    const mobile = s?.role === "citizen" ? s.mobile : config.showDemoOtp ? DEMO_MOBILE : null;
    if (!mobile) return next(unauthorized("Sign in with your mobile number to try a call"));
    const wsUrl = config.publicUrl ? `${config.publicUrl.replace(/^http/, "ws")}/api/phone/browser` : null;
    res.json({ token: callToken(mobile), wsUrl, mobile: `${mobile.slice(0, 2)}••••••${mobile.slice(-2)}` });
  });
