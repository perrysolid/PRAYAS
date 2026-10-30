import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { badRequest } from "../lib/httpError.js";

type Part = "body" | "query" | "params";

/** Validates and replaces req[part] with the parsed value; returns field-level errors the UI can show inline. */
export const validate =
  (schema: ZodType, part: Part = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_";
        fields[key] ??= issue.message;
      }
      return next(badRequest("VALIDATION_FAILED", "Check the highlighted fields", fields));
    }
    if (part === "query") Object.assign(req.query, result.data);
    else req[part] = result.data;
    next();
  };
