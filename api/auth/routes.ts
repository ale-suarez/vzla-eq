import type { Hono } from "hono";

import { authCallbackGet, authMagicLinkPost, authMeGet, authSignOutPost } from "@/api/auth/handlers";

export function registerAuthRoutes(app: Hono) {
  app.get("/auth/callback", authCallbackGet);
  app.post("/auth/magic-link", authMagicLinkPost);
  app.get("/auth/me", authMeGet);
  app.post("/auth/signout", authSignOutPost);
}

