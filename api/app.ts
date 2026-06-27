import { Hono } from "hono";

import { registerAnalysisRoutes } from "@/api/analysis/routes";
import { registerAuthRoutes } from "@/api/auth/routes";
import { registerGeocodeRoutes } from "@/api/geocode/routes";
import { registerIncidentRoutes } from "@/api/incidents/routes";

export const apiApp = new Hono().basePath("/api");

registerAnalysisRoutes(apiApp);
registerAuthRoutes(apiApp);
registerGeocodeRoutes(apiApp);
registerIncidentRoutes(apiApp);
