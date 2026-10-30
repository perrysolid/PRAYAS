import { Router } from "express";
import * as ctrl from "../controllers/auth.controller.js";
import { otpLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { officerLoginSchema, sendOtpSchema, verifyOtpSchema } from "../validators/schemas.js";

export const authRoutes = Router()
  .post("/otp/send", otpLimiter, validate(sendOtpSchema), ctrl.sendOtp)
  .post("/otp/verify", validate(verifyOtpSchema), ctrl.verifyOtp)
  .post("/officer/login", otpLimiter, validate(officerLoginSchema), ctrl.officerLogin)
  .get("/me", ctrl.me)
  .post("/logout", ctrl.logout);
