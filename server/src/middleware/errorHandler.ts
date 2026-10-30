import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/httpError.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "No such API route" } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something failed on our side. Your data is safe; try again in a minute." } });
}
