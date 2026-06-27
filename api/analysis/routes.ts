import type { Hono } from "hono";

import { analyzePost } from "@/api/analysis/handlers";

export function registerAnalysisRoutes(app: Hono) {
  app.post("/analizar", analyzePost);
}

