import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import * as ctrl from "../controllers/demo.controller.js";
import { notFound } from "../lib/httpError.js";
import { validate } from "../middleware/validate.js";
import { demoPolishSchema, demoResetSchema, demoResolveSchema } from "../validators/schemas.js";

// The guided demo exists only where demo sign-in codes are shown; production has no such routes.
const demoOnly = (_req: Request, _res: Response, next: NextFunction) => next(config.showDemoOtp ? undefined : notFound());
const demoLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "The demo is busy. Wait a minute and try again." } } });

export const demoRoutes = Router()
  .use(demoOnly, demoLimiter)
  .post("/reset", validate(demoResetSchema), ctrl.reset)
  .post("/polish", validate(demoPolishSchema), ctrl.polish)
  .post("/resolve", validate(demoResolveSchema), ctrl.resolve);
