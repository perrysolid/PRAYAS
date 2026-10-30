import type { NextFunction, Request, Response } from "express";
import { forbidden, unauthorized } from "../lib/httpError.js";
import { SESSION_COOKIE, verifySession } from "../lib/tokens.js";
import type { CitizenSession, OfficerSession, Session } from "../types.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export function loadSession(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) req.session = verifySession(token) ?? undefined;
  next();
}

export function requireCitizen(req: Request, _res: Response, next: NextFunction) {
  if (!req.session) return next(unauthorized());
  if (req.session.role !== "citizen") return next(forbidden("This page is for citizens"));
  next();
}

export function requireOfficer(req: Request, _res: Response, next: NextFunction) {
  if (!req.session) return next(unauthorized("Officer sign-in required"));
  if (req.session.role !== "officer") return next(forbidden("This page is for officers"));
  next();
}

export const citizenOf = (req: Request) => req.session as CitizenSession;
export const officerOf = (req: Request) => req.session as OfficerSession;
