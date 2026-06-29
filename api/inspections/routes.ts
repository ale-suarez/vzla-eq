import type { Hono } from "hono";

import { inspectionByIdGet, inspectionsPost } from "@/api/inspections/handlers";

export function registerInspectionRoutes(app: Hono) {
  app.post("/inspections", inspectionsPost);
  app.get("/inspections/:id", inspectionByIdGet);
}
