import type { Hono } from "hono";

import {
  inspectionByIdGet,
  inspectionByIdPut,
  inspectionsGet,
  inspectionsPost,
} from "@/api/inspections/handlers";
import { inspectionDraftPost } from "@/api/inspections/draft";
import { discordanceGet, trainingExportGet } from "@/api/inspections/feedback";

export function registerInspectionRoutes(app: Hono) {
  app.post("/inspections/draft", inspectionDraftPost);
  app.get("/inspections/feedback/discordance", discordanceGet);
  app.get("/inspections/feedback/training-export", trainingExportGet);
  app.get("/inspections", inspectionsGet);
  app.post("/inspections", inspectionsPost);
  app.get("/inspections/:id", inspectionByIdGet);
  app.put("/inspections/:id", inspectionByIdPut);
}
