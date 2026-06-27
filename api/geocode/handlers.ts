import type { Context } from "hono";

// Free OpenStreetMap geocoder. Per the Nominatim usage policy we must send an
// identifying User-Agent and keep volume low (the client debounces). Results
// are biased to Venezuela so the sparse local coverage stays relevant.
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "ChequeoEstructural/1.0 (https://chequeo-estructural.app)";
// Rough bounding box around Caracas (left,top,right,bottom) to favour local hits.
const CARACAS_VIEWBOX = "-67.10,10.55,-66.70,10.35";

type NominatimPlace = {
  lat: string;
  lon: string;
  display_name: string;
};

async function fetchNominatim(path: string): Promise<Response> {
  return fetch(`${NOMINATIM_BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
}

// GET /api/geocode/search?q=...
// Forward geocode: free text -> ranked candidates with coordinates.
export async function geocodeSearch(c: Context) {
  const q = c.req.query("q")?.trim();
  if (!q || q.length < 3) {
    return c.json({ data: [] });
  }

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "0",
    limit: "5",
    countrycodes: "ve",
    viewbox: CARACAS_VIEWBOX,
    // Prefer, but don't restrict to, the viewbox so out-of-Caracas hits still surface.
    bounded: "0",
  });

  try {
    const res = await fetchNominatim(`/search?${params.toString()}`);
    if (!res.ok) {
      return c.json({ error: "No se pudo buscar la dirección." }, 502);
    }
    const places = (await res.json()) as NominatimPlace[];
    const data = places
      .map((p) => ({
        label: p.display_name,
        lat: Number(p.lat),
        lng: Number(p.lon),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    return c.json({ data });
  } catch {
    return c.json({ error: "Error de conexión con el servicio de mapas." }, 502);
  }
}

// GET /api/geocode/reverse?lat=...&lng=...
// Reverse geocode: a pinned coordinate -> a single human-readable label.
export async function geocodeReverse(c: Context) {
  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return c.json({ error: "Coordenadas inválidas." }, 400);
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "0",
  });

  try {
    const res = await fetchNominatim(`/reverse?${params.toString()}`);
    if (!res.ok) {
      return c.json({ error: "No se pudo resolver la dirección." }, 502);
    }
    const place = (await res.json()) as NominatimPlace & { error?: string };
    if (place.error || !place.display_name) {
      return c.json({ data: { label: null } });
    }
    return c.json({ data: { label: place.display_name } });
  } catch {
    return c.json({ error: "Error de conexión con el servicio de mapas." }, 502);
  }
}
