import { Router } from "express";
import * as ctrl from "../controllers/grievance.controller.js";
import { requireCitizen } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { createGrievanceSchema, feedbackSchema, idParam, reopenSchema, similarQuery, trackQuery, triageSchema } from "../validators/schemas.js";

export const grievanceRoutes = Router()
  .post("/triage", writeLimiter, validate(triageSchema), ctrl.triage)
  .get("/track", validate(trackQuery, "query"), ctrl.track)
  .get("/similar", validate(similarQuery, "query"), ctrl.similar)
  .get("/", requireCitizen, ctrl.listMine)
  .post("/", requireCitizen, writeLimiter, validate(createGrievanceSchema), ctrl.create)
  .get("/:id", requireCitizen, validate(idParam, "params"), ctrl.getMine)
  .post("/:id/reminder", requireCitizen, validate(idParam, "params"), ctrl.remind)
  .post("/:id/feedback", requireCitizen, validate(idParam, "params"), validate(feedbackSchema), ctrl.feedback)
  .post("/:id/support", requireCitizen, writeLimiter, validate(idParam, "params"), ctrl.support)
  .post("/:id/reopen", requireCitizen, validate(idParam, "params"), validate(reopenSchema), ctrl.reopen);
