import { Router } from "express";
import * as ctrl from "../controllers/officer.controller.js";
import { requireOfficer } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParam, officerActionSchema, officerNoteSchema } from "../validators/schemas.js";

export const officerRoutes = Router()
  .use(requireOfficer)
  .get("/grievances", ctrl.list)
  .post("/ai/note", validate(officerNoteSchema), ctrl.draftNote)
  .post("/grievances/:id/actions", validate(idParam, "params"), validate(officerActionSchema), ctrl.act);
