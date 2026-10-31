import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";
import { loadSession } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { api } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Hops in front of the API: 1 behind a host proxy, 2 when the website host also forwards /api (Vercel → Render).
  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
  // Spoken replies are played from in-memory blobs.
  app.use(helmet({ contentSecurityPolicy: { directives: { "media-src": ["'self'", "blob:"] } } }));
  app.use(compression());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  // Room for one browser-compressed photo per request.
  app.use(express.json({ limit: "2mb", verify: (req, _res, buf) => ((req as express.Request & { rawBody?: Buffer }).rawBody = buf) }));
  app.use(cookieParser());
  app.use(loadSession);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", apiLimiter, api);
  app.use("/api", notFoundHandler);

  // Serve the built client in production so one process hosts the whole portal.
  const clientDist = resolve(process.cwd(), "../client/dist");
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: "1h", index: false }));
    app.get("*", (_req, res) => res.sendFile(resolve(clientDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
