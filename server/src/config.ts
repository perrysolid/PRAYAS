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
  /** Claude model for all app logic (phone and WhatsApp agents, drafting, triage, briefs, translation). Haiku keeps replies fast. */
  claudeModel: process.env.CLAUDE_MODEL || "claude-haiku-5-5",
  /** Language model used for formal drafting, the assistant, translation and speech. Keys stay on the server. */
  ai: {
    key: process.env.AI_API_KEY ?? "",
    endpoint: process.env.AI_ENDPOINT || "https://generativelanguage.googleapis.com/v1beta",
    model: process.env.AI_MODEL ?? "",
    draftModel: process.env.AI_DRAFT_MODEL || process.env.AI_MODEL || "",
    ttsModel: process.env.AI_TTS_MODEL ?? "",
  },
  /** WhatsApp Business (Cloud API). Without a token, messages are simulated and shown in the demo phone. */
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN ?? "",
    phoneId: process.env.WHATSAPP_PHONE_ID ?? "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  },
  /** WhatsApp on an ordinary number, linked like WhatsApp Web (no Meta Business account). */
  waLink: {
    enabled: process.env.WA_LINK === "on",
    number: (process.env.WA_LINK_NUMBER ?? "").replace(/\D/g, ""),
  },
  /**
   * Officers who get new complaints and escalation briefs on WhatsApp, as "department:mobile" pairs.
   * "*" matches every department, e.g. "*:9876500002,water:9876500003".
   */
  officerWhatsApp: (process.env.OFFICER_WHATSAPP ?? "")
    .split(",")
    .map((p) => p.trim().split(":"))
    .filter((p) => p.length === 2 && /^\d{10}$/.test(p[1].replace(/\D/g, "").slice(-10)))
    .map(([dept, mobile]) => ({ dept: dept.trim(), mobile: mobile.replace(/\D/g, "").slice(-10) })),
  /** Phone agent: Exotel call audio, Sarvam speech in and out, Claude for the conversation. */
  voice: {
    sarvamKey: process.env.SARVAM_API_KEY ?? "",
    model: process.env.VOICE_MODEL || process.env.CLAUDE_MODEL || "claude-haiku-5-5",
    // Sarvam's top picks for Hindi and English customer care.
    speakerHi: process.env.SARVAM_SPEAKER_HI || "aparna_hi_customer",
    speakerEn: process.env.SARVAM_SPEAKER_EN || "aparna_en_companion",
    /** Shared secret in the Exotel Voicebot URL (?secret=…). Required in production. */
    streamSecret: process.env.PHONE_STREAM_SECRET ?? "",
    /** Garhwali speech recognition (Meta Omnilingual ASR, see garhwali-asr/). Optional. */
    garhwaliUrl: (process.env.GARHWALI_ASR_URL ?? "").replace(/\/$/, ""),
    garhwaliToken: process.env.GARHWALI_ASR_TOKEN ?? "",
    maxCalls: Number(process.env.VOICE_MAX_CALLS ?? 4),
  },
  /** Public https address of this API, for the browser practice call and the keep-awake ping. */
  publicUrl: (process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, ""),
  /** Postgres (Neon) as the database. Preferred over Supabase when both are set. */
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** Supabase as the database. Without it, data is kept in data.json. */
  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  /** Return the OTP in the API response. Never enable with a real SMS gateway. */
  showDemoOtp: !isProd || process.env.SHOW_DEMO_OTP === "true",
  otpTtlMs: 5 * 60 * 1000,
  otpResendMs: 30 * 1000,
  dataFile: resolve(process.cwd(), "data.json"),
};
