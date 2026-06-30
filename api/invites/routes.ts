import type { Hono } from "hono";

import { inviteByIdPatch, inviteResolveGet, invitesGet, invitesPost } from "@/api/invites/handlers";

export function registerInviteRoutes(app: Hono) {
  // Public: resolve a token for the /join page.
  app.get("/invites/resolve/:token", inviteResolveGet);
  // Admin-only.
  app.get("/invites", invitesGet);
  app.post("/invites", invitesPost);
  app.patch("/invites/:id", inviteByIdPatch);
}
