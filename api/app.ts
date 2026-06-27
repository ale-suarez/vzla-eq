import { Hono } from "hono";

import { registerAnalysisRoutes } from "@/api/analysis/routes";
import { registerAuthRoutes } from "@/api/auth/routes";
import { registerIncidentRoutes } from "@/api/incidents/routes";

export const apiApp = new Hono().basePath("/api");

registerAnalysisRoutes(apiApp);
registerAuthRoutes(apiApp);
registerIncidentRoutes(apiApp);
