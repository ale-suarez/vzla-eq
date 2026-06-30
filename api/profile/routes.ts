import type { Hono } from "hono";

import { profileGet, profilePatch } from "@/api/profile/handlers";

export function registerProfileRoutes(app: Hono) {
  app.get("/profile", profileGet);
  app.patch("/profile", profilePatch);
}
