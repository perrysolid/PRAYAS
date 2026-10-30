import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { Session } from "../types.js";

export const SESSION_COOKIE = "cmh_session";
const TTL_SECONDS = 60 * 60 * 8;

export function signSession(session: Session): string {
  return jwt.sign(session, config.jwtSecret, { expiresIn: TTL_SECONDS });
}

export function verifySession(token: string): Session | null {
  try {
    const { iat: _iat, exp: _exp, ...session } = jwt.verify(token, config.jwtSecret) as Session & { iat: number; exp: number };
    return session as Session;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.isProd,
  maxAge: TTL_SECONDS * 1000,
  path: "/",
};
