import type { Hono } from "hono";

import {
  incidentByIdGet,
  incidentByIdPut,
  incidentsGet,
  incidentsPost,
} from "@/api/incidents/handlers";

export function registerIncidentRoutes(app: Hono) {
  app.get("/incidents", incidentsGet);
  app.post("/incidents", incidentsPost);
  app.get("/incidents/:id", incidentByIdGet);
  app.put("/incidents/:id", incidentByIdPut);
}

