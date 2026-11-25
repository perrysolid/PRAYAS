import { randomInt, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import { config } from "../config.js";
import { badRequest, HttpError, unauthorized } from "../lib/httpError.js";
import type { Level, OfficerSession } from "../types.js";

type OtpEntry = { hash: string; expiresAt: number; sentAt: number; attempts: number };
const otps = new Map<string, OtpEntry>();

const hashOtp = (mobile: string, otp: string) => scryptSync(`${mobile}:${otp}`, config.jwtSecret, 32).toString("hex");

/** Fictional numbers for the walkthrough: their OTP is shown on screen, never texted. */
export const DEMO_MOBILES = ["9876543210", "9876500001"];
export const smsEnabled = () => Boolean(config.twoFactorKey);

/** Texts the OTP through 2Factor.in (its own DLT-approved OTP template). */
async function textOtp(mobile: string, otp: string) {
  const url = `https://2factor.in/API/V1/${encodeURIComponent(config.twoFactorKey)}/SMS/91${mobile}/${otp}`;
  try {
    const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000) });
    const body = (await res.json().catch(() => ({}))) as { Status?: string; Details?: string };
    if (res.ok && body.Status === "Success") return;
    console.warn(`[sms] 2Factor refused the OTP (${res.status}: ${body.Details ?? "no detail"})`);
  } catch (err) {
    console.warn(`[sms] 2Factor unreachable (${(err as Error).message})`);
  }
  throw new HttpError(502, "SMS_FAILED", "We could not send the OTP by SMS just now. Please try again in a minute.");
}

export async function sendOtp(mobile: string): Promise<{ resendInSeconds: number; devOtp?: string; sms?: boolean }> {
  const existing = otps.get(mobile);
  const now = Date.now();
  if (existing && now - existing.sentAt < config.otpResendMs) {
    const wait = Math.ceil((config.otpResendMs - (now - existing.sentAt)) / 1000);
    throw new HttpError(429, "OTP_COOLDOWN", `Wait ${wait} seconds before asking for a new OTP`, { resendInSeconds: wait });
  }
  const otp = String(randomInt(100000, 1000000));
  otps.set(mobile, { hash: hashOtp(mobile, otp), expiresAt: now + config.otpTtlMs, sentAt: now, attempts: 0 });
  const demo = config.showDemoOtp && DEMO_MOBILES.includes(mobile);
  if (smsEnabled() && !demo) {
    try {
      await textOtp(mobile, otp);
    } catch (err) {
      otps.delete(mobile); // let them ask again straight away
      throw err;
    }
    return { resendInSeconds: config.otpResendMs / 1000, sms: true };
  }
  // Without an SMS gateway (or for the demo numbers) the prototype shows the OTP on screen.
  return { resendInSeconds: config.otpResendMs / 1000, devOtp: config.showDemoOtp ? otp : undefined };
}

export function verifyOtp(mobile: string, otp: string) {
  const entry = otps.get(mobile);
  if (!entry || entry.expiresAt < Date.now()) throw badRequest("OTP_EXPIRED", "This OTP has expired. Ask for a new one.");
  entry.attempts += 1;
  if (entry.attempts > 5) {
    otps.delete(mobile);
    throw badRequest("OTP_LOCKED", "Too many wrong attempts. Ask for a new OTP.");
  }
  const ok = timingSafeEqual(Buffer.from(entry.hash, "hex"), Buffer.from(hashOtp(mobile, otp), "hex"));
  if (!ok) {
    const left = 5 - entry.attempts;
    const message = left > 0 ? `That OTP is not correct. ${left} attempts left.` : "That OTP is not correct. Ask for a new OTP.";
    throw badRequest("OTP_INVALID", message, { otp: message });
  }
  otps.delete(mobile);
}

// Demo officer accounts. A real deployment authenticates officers through Jan Parichay / MeriPehchaan.
type Officer = Omit<OfficerSession, "role"> & { salt: string; hash: string };
const DEMO_PASSWORD = "Demo@1905";

function makeOfficer(username: string, name: string, departmentId: string, level: Level): Officer {
  const salt = randomBytes(16).toString("hex");
  return { username, name, departmentId, level, salt, hash: scryptSync(DEMO_PASSWORD, salt, 32).toString("hex") };
}

const officers: Officer[] = [
  makeOfficer("je.jal.khirsu", "Junior Engineer, Jal Sansthan", "water", 1),
  makeOfficer("sdo.upcl.srinagar", "Sub Divisional Officer, UPCL", "energy", 1),
  makeOfficer("ee.pwd.pauri", "Executive Engineer, PWD", "pwd", 2),
  // For demonstrations: an L1 officer who sees and acts on complaints of every department ("*").
  makeOfficer("l1.demo", "Block / tehsil officer (all departments)", "*", 1),
];

export const demoOfficerUsernames = officers.map((o) => o.username);


export function officerLogin(username: string, password: string): OfficerSession {
  const officer = officers.find((o) => o.username === username);
  const candidate = scryptSync(password, officer?.salt ?? "x".repeat(32), 32);
  if (!officer || !timingSafeEqual(candidate, Buffer.from(officer.hash, "hex"))) {
    throw unauthorized("Username or password is not correct");
  }
  return { role: "officer", username: officer.username, name: officer.name, departmentId: officer.departmentId, level: officer.level };
}
