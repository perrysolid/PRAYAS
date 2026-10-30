import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env loader so the prototype runs without extra dependencies.
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

const isProd = process.env.NODE_ENV === "production";

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-me-in-production")) {
  throw new Error("JWT_SECRET must be set to a strong value in production");
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd,
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(",").map((o) => o.trim()),
  anthropicEnabled: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  /** Return the OTP in the API response. Never enable with a real SMS gateway. */
  showDemoOtp: !isProd || process.env.SHOW_DEMO_OTP === "true",
  otpTtlMs: 5 * 60 * 1000,
  otpResendMs: 30 * 1000,
  dataFile: resolve(process.cwd(), "data.json"),
};
