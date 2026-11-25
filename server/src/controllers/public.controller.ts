import type { Request, Response } from "express";
import { departments, districts, governmentOrders, levels, MAX_OPEN_GRIEVANCES } from "../data/catalog.js";
import { store } from "../data/store.js";
import { config } from "../config.js";
import { pinInfo, setLocation } from "../services/grievance.service.js";
import { search as runSearch } from "../services/search.service.js";
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

/** Who may pin a complaint's location: the signed link from WhatsApp, or the signed-in citizen. */
const pinner = (req: Request, token?: unknown) => ({
  token: typeof token === "string" ? token : undefined,
  mobile: req.session?.role === "citizen" ? req.session.mobile : undefined,
});

export function pin(req: Request, res: Response) {
  res.set("Cache-Control", "no-store");
  res.json(pinInfo(String(req.params.id).toUpperCase(), pinner(req, req.query.t)));
}

export function savePin(req: Request, res: Response) {
  const { lat, lng, t } = req.body as { lat: number; lng: number; t?: string };
  const g = setLocation(String(req.params.id).toUpperCase(), pinner(req, t), lat, lng, "map");
  res.json({ location: g.location });
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

export function siteFeedback(req: Request, res: Response) {
  const f = req.body as { rating: number; ease?: number; recommend?: number; used: string[]; kind: string; comments: string; name: string; email: string; contactMe: boolean };
  const message = [
    `[Feedback: ${f.kind}] Overall ${f.rating}/5`,
    f.ease ? `Ease ${f.ease}/5` : "",
    f.recommend !== undefined ? `Recommend ${f.recommend}/10` : "",
    f.used.length ? `Used: ${f.used.join(", ")}` : "",
    f.contactMe ? "May be contacted" : "",
    f.comments,
  ].filter(Boolean).join(" | ");
  store.contact.insert({ at: new Date().toISOString(), name: f.name || "Anonymous", email: f.email, message });
  res.status(201).json({ ok: true });
}

export function search(req: Request, res: Response) {
  res.json(runSearch(String(req.query.q ?? "")));
}
