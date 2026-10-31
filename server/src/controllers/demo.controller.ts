import type { NextFunction, Request, Response } from "express";
import { store } from "../data/store.js";
import { forbidden, notFound } from "../lib/httpError.js";
import { actionReport } from "../services/ai.service.js";
import { demoOfficerFor } from "../services/auth.service.js";
import * as grievances from "../services/grievance.service.js";
import { resetConversation } from "../services/whatsapp.service.js";
import { DEMO_MOBILES } from "./whatsapp.controller.js";

export function reset(req: Request, res: Response) {
  resetConversation(req.body.mobile);
  res.json({ ok: true });
}

/** The officer's rough notes, rewritten as an action-taken report. Falls back to the notes as written. */
export function polish(req: Request, res: Response) {
  actionReport(req.body.text, req.body.lang).then(
    (out) => res.json(out),
    () => res.json({ report: req.body.text }),
  );
}

/** Resolve a complaint raised from a demo number, as that department's officer, with photo proof. */
export function resolve(req: Request, res: Response, next: NextFunction) {
  try {
    const g = store.grievances.find(req.body.id);
    if (!g) throw notFound("No complaint with that number");
    if (!DEMO_MOBILES.includes(g.citizenMobile)) throw forbidden("Only complaints from the demo numbers can be resolved here");
    if (req.body.before && !g.photos?.before) g.photos = { ...g.photos, before: { ...req.body.before, at: g.submittedAt } };
    const officer = demoOfficerFor(g.departmentId);
    res.json({ officer: officer.name, grievance: grievances.officerAct(officer, g.id, "resolve", req.body.note, req.body.after) });
  } catch (err) {
    next(err);
  }
}
