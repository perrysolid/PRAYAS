import { Router } from "express";
import * as ctrl from "../controllers/public.controller.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { contactSchema, ordersQuery } from "../validators/schemas.js";

export const publicRoutes = Router()
  .get("/meta", ctrl.meta)
  .get("/stats", ctrl.stats)
  .get("/orders", validate(ordersQuery, "query"), ctrl.orders)
  .post("/contact", writeLimiter, validate(contactSchema), ctrl.contact);
