import type { Request, Response } from "express";
import { officerOf } from "../middleware/auth.js";
import * as grievances from "../services/grievance.service.js";

export function list(req: Request, res: Response) {
  res.json(grievances.listForOfficer(officerOf(req), { status: typeof req.query.status === "string" ? req.query.status : undefined }));
}

export function act(req: Request, res: Response) {
  res.json(grievances.officerAct(officerOf(req), req.params.id, req.body.action, req.body.note, req.body.photo));
}
