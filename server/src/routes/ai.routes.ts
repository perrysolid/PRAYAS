import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as ctrl from "../controllers/ai.controller.js";
import { validate } from "../middleware/validate.js";
import { assistantSchema, draftSchema, speakSchema, translateSchema } from "../validators/schemas.js";

// Model calls cost money and time, so each visitor gets a modest budget.
const aiLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Too many requests to the assistant. Wait a minute and try again." } } });
const translateLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Translation is busy. Wait a minute and try again." } } });

export const aiRoutes = Router()
  .get("/status", ctrl.status)
  .post("/draft", aiLimiter, validate(draftSchema), ctrl.draft)
  .post("/assistant", aiLimiter, validate(assistantSchema), ctrl.assistant)
  .post("/translate", translateLimiter, validate(translateSchema), ctrl.translate)
  .post("/speak", aiLimiter, validate(speakSchema), ctrl.speak);
