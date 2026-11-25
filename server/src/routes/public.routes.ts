import { Router } from "express";
import * as ctrl from "../controllers/public.controller.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { contactSchema, idParam, pinSchema, siteFeedbackSchema, ordersQuery, searchQuery } from "../validators/schemas.js";

export const publicRoutes = Router()
  .get("/meta", ctrl.meta)
  .get("/stats", ctrl.stats)
  .get("/search", validate(searchQuery, "query"), ctrl.search)
  .get("/orders", validate(ordersQuery, "query"), ctrl.orders)
  .get("/pin/:id", validate(idParam, "params"), ctrl.pin)
  .post("/pin/:id", writeLimiter, validate(idParam, "params"), validate(pinSchema), ctrl.savePin)
  .post("/contact", writeLimiter, validate(contactSchema), ctrl.contact)
  .post("/feedback", writeLimiter, validate(siteFeedbackSchema), ctrl.siteFeedback);
