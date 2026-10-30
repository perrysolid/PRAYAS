import type { Request, Response } from "express";
import * as auth from "../services/auth.service.js";
import { cookieOptions, SESSION_COOKIE, signSession } from "../lib/tokens.js";

export function sendOtp(req: Request, res: Response) {
  res.json(auth.sendOtp(req.body.mobile));
}

export function verifyOtp(req: Request, res: Response) {
  auth.verifyOtp(req.body.mobile, req.body.otp);
  const session = { role: "citizen" as const, mobile: req.body.mobile };
  res.cookie(SESSION_COOKIE, signSession(session), cookieOptions).json({ session });
}

export function officerLogin(req: Request, res: Response) {
  const session = auth.officerLogin(req.body.username, req.body.password);
  res.cookie(SESSION_COOKIE, signSession(session), cookieOptions).json({ session });
}

export function me(req: Request, res: Response) {
  res.json({ session: req.session ?? null });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" }).json({ ok: true });
}
