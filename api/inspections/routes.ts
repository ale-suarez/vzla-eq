import type { Hono } from "hono";

import { inspectionByIdGet, inspectionsPost } from "@/api/inspections/handlers";
import { inspectionDraftPost } from "@/api/inspections/draft";

export function registerInspectionRoutes(app: Hono) {
  app.post("/inspections/draft", inspectionDraftPost);
  app.post("/inspections", inspectionsPost);
  app.get("/inspections/:id", inspectionByIdGet);
}
