import type { NextFunction, Request, Response } from "express";
import { citizenOf } from "../middleware/auth.js";
import * as grievances from "../services/grievance.service.js";
import { triage as runTriage } from "../services/triage.service.js";

// Express 4 does not forward rejected promises, so pass failures to next() explicitly.
export function triage(req: Request, res: Response, next: NextFunction) {
  runTriage(req.body.text).then((result) => res.json(result), next);
}

export function create(req: Request, res: Response) {
  res.status(201).json(grievances.create(citizenOf(req), req.body));
}

export function listMine(req: Request, res: Response) {
  res.json(grievances.listMine(citizenOf(req)));
}

export function getMine(req: Request, res: Response) {
  res.json(grievances.getMine(citizenOf(req), req.params.id));
}

export function track(req: Request, res: Response) {
  res.json(grievances.track(String(req.query.id), String(req.query.mobile)));
}

export function remind(req: Request, res: Response) {
  res.json(grievances.remind(citizenOf(req), req.params.id));
}

export function feedback(req: Request, res: Response) {
  res.json(grievances.giveFeedback(citizenOf(req), req.params.id, req.body.rating, req.body.comment));
}

export function reopen(req: Request, res: Response) {
  res.json(grievances.reopen(citizenOf(req), req.params.id, req.body.reason));
}

export function similar(req: Request, res: Response) {
  res.json(grievances.similar(req.query as { departmentId: string; districtId: string; categoryId?: string; block?: string }));
}

export function support(req: Request, res: Response) {
  res.json(grievances.support(citizenOf(req), req.params.id));
}
