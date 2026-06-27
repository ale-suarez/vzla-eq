import type { Hono } from "hono";

import { geocodeReverse, geocodeSearch } from "@/api/geocode/handlers";

export function registerGeocodeRoutes(app: Hono) {
  app.get("/geocode/search", geocodeSearch);
  app.get("/geocode/reverse", geocodeReverse);
}
