import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { grievanceRoutes } from "./grievance.routes.js";
import { officerRoutes } from "./officer.routes.js";
import { publicRoutes } from "./public.routes.js";

export const api = Router()
  .use("/auth", authRoutes)
  .use("/grievances", grievanceRoutes)
  .use("/officer", officerRoutes)
  .use("/", publicRoutes);
