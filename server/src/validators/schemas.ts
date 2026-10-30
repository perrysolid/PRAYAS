import { z } from "zod";
import { departments, districts } from "../data/catalog.js";

const mobile = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number starting with 6, 7, 8 or 9");
const grievanceId = z.string().trim().toUpperCase().regex(/^CMH-\d{4}-\d{6}$/, "Complaint numbers look like CMH-2026-004512");

export const sendOtpSchema = z.object({ mobile });
export const verifyOtpSchema = z.object({ mobile, otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit OTP") });
export const officerLoginSchema = z.object({ username: z.string().trim().min(1, "Enter your username"), password: z.string().min(1, "Enter your password") });

// Photos arrive already resized in the browser (≤1280px JPEG), so 1.5 MB of base64 is generous.
export const photoSchema = z.object({
  dataUrl: z.string().max(1_500_000, "The photo is too large. Choose a smaller one.").regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Attach a JPEG, PNG or WebP photo"),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

export const triageSchema = z.object({ text: z.string().trim().min(10, "Describe the problem in at least 10 characters").max(4000) });

export const createGrievanceSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  type: z.enum(["complaint", "demand", "suggestion"]),
  departmentId: z.enum(departments.map((d) => d.id) as [string, ...string[]], { error: "Choose a department" }),
  categoryId: z.string().min(1, "Choose a category"),
  subject: z.string().trim().min(5, "Write a short subject (at least 5 characters)").max(120, "Keep the subject under 120 characters"),
  description: z.string().trim().min(20, "Describe the problem in at least 20 characters").max(4000, "Keep the description under 4,000 characters"),
  districtId: z.enum(districts.map((d) => d.id) as [string, ...string[]], { error: "Choose your district" }),
  block: z.string().trim().max(60).optional(),
  village: z.string().trim().max(120).optional(),
  triage: z
    .object({ source: z.enum(["ai", "rules"]), confidence: z.number().min(0).max(1), urgency: z.enum(["normal", "high"]) })
    .optional(),
  photo: photoSchema.optional(),
});

export const similarQuery = z.object({
  departmentId: z.string().trim().max(40),
  districtId: z.string().trim().max(40),
  categoryId: z.string().trim().max(40).optional(),
  block: z.string().trim().max(60).optional(),
});

export const idParam = z.object({ id: grievanceId });
export const trackQuery = z.object({ id: grievanceId, mobile });
export const feedbackSchema = z.object({ rating: z.number().int().min(1, "Choose a rating").max(5), comment: z.string().trim().max(500).optional() });
export const reopenSchema = z.object({ reason: z.string().trim().min(10, "Tell us why in at least 10 characters").max(1000) });
export const officerActionSchema = z
  .object({ action: z.enum(["note", "resolve"]), note: z.string().trim().min(10, "Write at least 10 characters about the action taken").max(2000), photo: photoSchema.optional() })
  .refine((v) => v.action !== "resolve" || v.photo, { path: ["photo"], message: "Attach a photo that shows the problem is fixed (or the order or letter issued)" });
export const ordersQuery = z.object({ q: z.string().trim().max(100).optional(), kind: z.enum(["go", "minutes"]).optional() });
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.email("Enter a valid email address"),
  message: z.string().trim().min(10, "Write at least 10 characters").max(2000),
});
