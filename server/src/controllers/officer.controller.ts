import type { NextFunction, Request, Response } from "express";
import { actionReport } from "../services/ai.service.js";
import { officerOf } from "../middleware/auth.js";
import * as grievances from "../services/grievance.service.js";

export function list(req: Request, res: Response) {
  res.json(grievances.listForOfficer(officerOf(req), { status: typeof req.query.status === "string" ? req.query.status : undefined }));
}

export function act(req: Request, res: Response) {
  res.json(grievances.officerAct(officerOf(req), req.params.id, req.body.action, req.body.note, req.body.photo));
}

export function draftNote(req: Request, res: Response, next: NextFunction) {
  actionReport(req.body.text, req.body.lang).then((out) => res.json(out), next);
}
