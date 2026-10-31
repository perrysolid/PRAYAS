import type { NextFunction, Request, Response } from "express";
import * as ai from "../services/ai.service.js";

// Express 4 does not forward rejected promises, so pass failures to next() explicitly.

export function status(_req: Request, res: Response) {
  res.json(ai.status());
}

export function draft(req: Request, res: Response, next: NextFunction) {
  ai.draft(req.body.text, req.body.lang).then((out) => res.json(out), next);
}

export function assist(req: Request, res: Response, next: NextFunction) {
  ai.assist(req.body.text, req.body.lang).then((out) => res.json(out), next);
}

export function assistant(req: Request, res: Response, next: NextFunction) {
  ai.assistant(req.body.messages, req.body.lang).then((out) => res.json(out), next);
}

export function translate(req: Request, res: Response, next: NextFunction) {
  ai.translate(req.body.strings, req.body.lang).then((items) => res.json({ items }), next);
}

export function speak(req: Request, res: Response, next: NextFunction) {
  ai.speak(req.body.text, req.body.lang, req.body.voice).then((audio) => res.set({ "content-type": "audio/wav", "cache-control": "private, max-age=3600" }).send(audio), next);
}
