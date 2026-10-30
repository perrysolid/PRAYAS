import rateLimit from "express-rate-limit";

const json = (message: string) => ({ error: { code: "RATE_LIMITED", message } });

export const apiLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false, message: json("Too many requests. Wait a minute and try again.") });
export const otpLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false, message: json("Too many OTP requests. Try again in 15 minutes or call 1905.") });
export const writeLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: json("Too many submissions. Wait a minute and try again.") });
