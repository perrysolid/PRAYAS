import { Router } from "express";
import { aiRoutes } from "./ai.routes.js";
import { authRoutes } from "./auth.routes.js";
import { demoRoutes } from "./demo.routes.js";
import { grievanceRoutes } from "./grievance.routes.js";
import { officerRoutes } from "./officer.routes.js";
import { whatsappRoutes } from "./whatsapp.routes.js";
import { publicRoutes } from "./public.routes.js";

export const api = Router()
  .use("/ai", aiRoutes)
  .use("/auth", authRoutes)
  .use("/demo", demoRoutes)
  .use("/grievances", grievanceRoutes)
  .use("/officer", officerRoutes)
  .use("/whatsapp", whatsappRoutes)
  .use("/", publicRoutes);
