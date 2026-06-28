import type { Hono } from "hono";

import { engineerSolicitudByIdPatch, ingenierosSolicitudesGet, ingenierosSolicitudesPost } from "@/api/ingenieros/handlers";

export function registerEngineerRoutes(app: Hono) {
  app.get("/ingenieros/solicitudes", ingenierosSolicitudesGet);
  app.post("/ingenieros/solicitudes", ingenierosSolicitudesPost);
  app.patch("/ingenieros/solicitudes/:id", engineerSolicitudByIdPatch);
}
