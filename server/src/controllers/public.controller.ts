import type { Request, Response } from "express";
import { departments, districts, governmentOrders, levels, MAX_OPEN_GRIEVANCES } from "../data/catalog.js";
import { store } from "../data/store.js";
import { config } from "../config.js";
import { publicStats } from "../services/stats.service.js";

export function meta(_req: Request, res: Response) {
  res.set("Cache-Control", "public, max-age=300");
  res.json({
    departments: departments.map(({ keywords: _k, ...d }) => d),
    districts,
    levels,
    maxOpenGrievances: MAX_OPEN_GRIEVANCES,
    aiTriage: config.anthropicEnabled,
  });
}

export function stats(_req: Request, res: Response) {
  res.json(publicStats());
}

export function orders(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
  const kind = req.query.kind;
  const rows = governmentOrders
    .filter((o) => !kind || o.kind === kind)
    .filter((o) => !q || o.title.en.toLowerCase().includes(q) || o.title.hi.includes(q))
    // Newest first; undated orders last.
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  res.json(rows);
}

export function contact(req: Request, res: Response) {
  store.contact.insert({ at: new Date().toISOString(), ...req.body });
  res.status(201).json({ ok: true });
}
