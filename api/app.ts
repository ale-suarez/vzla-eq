import { Hono } from "hono";

import { registerAnalysisRoutes } from "@/api/analysis/routes";
import { registerAuthRoutes } from "@/api/auth/routes";
import { registerEngineerRoutes } from "@/api/ingenieros/routes";
import { registerGeocodeRoutes } from "@/api/geocode/routes";
import { registerIncidentRoutes } from "@/api/incidents/routes";
import { registerInspectionRoutes } from "@/api/inspections/routes";
import { registerInviteRoutes } from "@/api/invites/routes";
import { registerProfileRoutes } from "@/api/profile/routes";

export const apiApp = new Hono().basePath("/api");

apiApp.onError((error, c) => {
  console.error("[api] unhandled error", error);
  return c.json({ error: "Error interno del servidor." }, 500);
});

registerAnalysisRoutes(apiApp);
registerAuthRoutes(apiApp);
registerEngineerRoutes(apiApp);
registerGeocodeRoutes(apiApp);
registerIncidentRoutes(apiApp);
registerInspectionRoutes(apiApp);
registerInviteRoutes(apiApp);
registerProfileRoutes(apiApp);
