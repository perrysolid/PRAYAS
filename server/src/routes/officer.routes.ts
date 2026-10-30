import { Router } from "express";
import * as ctrl from "../controllers/officer.controller.js";
import { requireOfficer } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParam, officerActionSchema } from "../validators/schemas.js";

export const officerRoutes = Router()
  .use(requireOfficer)
  .get("/grievances", ctrl.list)
  .post("/grievances/:id/actions", validate(idParam, "params"), validate(officerActionSchema), ctrl.act);
