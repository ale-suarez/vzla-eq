import { Hono } from "hono";

import { registerAnalysisRoutes } from "@/api/analysis/routes";
import { registerAuthRoutes } from "@/api/auth/routes";
import { registerEngineerRoutes } from "@/api/ingenieros/routes";
import { registerGeocodeRoutes } from "@/api/geocode/routes";
import { registerIncidentRoutes } from "@/api/incidents/routes";
import { registerInspectionRoutes } from "@/api/inspections/routes";
import { registerProfileRoutes } from "@/api/profile/routes";

export const apiApp = new Hono().basePath("/api");

registerAnalysisRoutes(apiApp);
registerAuthRoutes(apiApp);
registerEngineerRoutes(apiApp);
registerGeocodeRoutes(apiApp);
registerIncidentRoutes(apiApp);
registerInspectionRoutes(apiApp);
registerProfileRoutes(apiApp);
