import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as ctrl from "../controllers/whatsapp.controller.js";
import { validate } from "../middleware/validate.js";
import { waInboundSchema, waThreadQuery } from "../validators/schemas.js";

const demoLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Too many messages. Wait a minute and try again." } } });

export const whatsappRoutes = Router()
  .get("/status", ctrl.status)
  .get("/webhook", ctrl.verify)
  .post("/webhook", ctrl.webhook)
  .get("/thread", validate(waThreadQuery, "query"), ctrl.thread)
  .post("/inbound", demoLimiter, validate(waInboundSchema), ctrl.inbound);
