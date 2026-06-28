/**
 * Ingest Copernicus EMS rapid-mapping building damage into `incidents`.
 *
 * Source: Copernicus EMSR884, AOI12 La Guaira — "Daños en edificaciones"
 *   (rapid damage assessment, 25 Jun 2026). Licensed CC BY 4.0:
 *   reuse permitted with attribution; attribution is stored per-row in the
 *   provenance columns (source / source_license / source_url) and must be
 *   surfaced in any public UI.
 *
 * This is real, official, openly-licensed data used as the go-live seed until
 * the consented SismoAyuda VE feed grants query access. It carries no PII and
 * no photos.
 *
 * Idempotent: upserts on (source, source_ref) so re-runs refresh rather than
 * duplicate. Run again any time Copernicus updates the AOI.
 *
 * Usage:
 *   npx tsx scripts/ingest-copernicus.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (e.g. via .env.local).
 */
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// @supabase/supabase-js constructs a realtime client that needs a global
// WebSocket. Node < 22 has none; polyfill it (we only use REST here).
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

// Resolved to sources.id at runtime via this code. Feed-level metadata
// (license, url, attribution) lives in the `sources` row, not here.
const SOURCE_CODE = "copernicus-emsr884";
const ATTRIBUTION = "© Copernicus Emergency Management Service (EMSR884), CC BY 4.0";

const FEATURE_SERVER =
  "https://services2.arcgis.com/z4DP274UleGqgP1y/arcgis/rest/services/" +
  "EMSR884_AOI12_La_Guaira_Da%C3%B1os_en_edificaciones_25_Jun_2026/FeatureServer/0";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in the environment.");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Copernicus damage grades → our verdict enum. Copernicus only maps visible
// damage, so there is no `low` equivalent (confirmed with the user).
const DAMAGE_TO_SEVERITY: Record<string, "moderate" | "severe" | "critical"> = {
  "Possibly damaged": "moderate",
  Damaged: "severe",
  Destroyed: "critical",
};

// "11-Residential Buildings" → "residencial", etc. Falls back to the raw label.
function buildingUseFromObjType(objType: string | null): string | null {
  if (!objType) return null;
  const label = objType.replace(/^\d+-/, "").trim().toLowerCase();
  if (label.includes("residential")) return "residencial";
  if (label.includes("commercial")) return "comercial";
  if (label.includes("industrial")) return "industrial";
  if (label.includes("public")) return "edificio público";
  return label || null;
}

// Area-weighted centroid of a GeoJSON Polygon's outer ring.
function polygonCentroid(coords: number[][][]): { lat: number; lon: number } {
  const ring = coords[0];
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (area === 0) {
    // Degenerate ring: fall back to the first vertex.
    return { lon: ring[0][0], lat: ring[0][1] };
  }
  area *= 0.5;
  return { lon: cx / (6 * area), lat: cy / (6 * area) };
}

type GeoFeature = {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: number[][][] } | null;
};

async function fetchFeatures(): Promise<GeoFeature[]> {
  const url =
    `${FEATURE_SERVER}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&resultRecordCount=2000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Copernicus fetch failed: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { features?: GeoFeature[] };
  return data.features ?? [];
}

function toRow(feature: GeoFeature, index: number, sourceId: string) {
  const props = feature.properties;
  const grade = String(props.damage_gra ?? "");
  const severity = DAMAGE_TO_SEVERITY[grade];
  if (!severity) return null; // skip unmapped/empty grades

  const objectId = props.FID ?? props.OBJECTID ?? props.objectid ?? index;
  const geom = feature.geometry;
  if (!geom || geom.type !== "Polygon") return null;
  const { lat, lon } = polygonCentroid(geom.coordinates);

  const detMethod = props.det_method ? ` (${props.det_method})` : "";

  return {
    source_id: sourceId,
    source_ref: String(objectId),
    synced_at: new Date().toISOString(),
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lon.toFixed(6)),
    address: "La Guaira, Venezuela", // Copernicus does not name individual buildings
    severity,
    ai_verdict: severity,
    confidence: null, // remote photo-interpretation; no per-building confidence
    finding: `Evaluación satelital Copernicus: ${grade}${detMethod}. ${ATTRIBUTION}`,
    analysis_status: "complete" as const,
    state: "pending" as const,
    building_use: buildingUseFromObjType(props.obj_type as string | null),
  };
}

async function resolveSourceId(): Promise<string> {
  const { data, error } = await supabase
    .from("sources")
    .select("id")
    .eq("code", SOURCE_CODE)
    .single();
  if (error || !data) {
    throw new Error(
      `Source "${SOURCE_CODE}" not found. Apply the provenance migration first.`
    );
  }
  return data.id as string;
}

async function main() {
  const sourceId = await resolveSourceId();

  console.log("Fetching Copernicus EMSR884 features…");
  const features = await fetchFeatures();
  console.log(`  ${features.length} features returned.`);

  const rows = features
    .map((f, i) => toRow(f, i, sourceId))
    .filter((r): r is NonNullable<typeof r> => r !== null);
  console.log(`  ${rows.length} mapped to incidents (unmapped grades skipped).`);

  // Upsert on the provenance key so re-runs refresh rather than duplicate.
  const { error, count } = await supabase
    .from("incidents")
    .upsert(rows, { onConflict: "source_id,source_ref", count: "exact" });
  if (error) throw error;

  console.log(`Upserted ${count ?? rows.length} Copernicus incidents (source="${SOURCE_CODE}").`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
