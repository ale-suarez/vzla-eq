import type { Context } from "hono";
import { randomUUID } from "node:crypto";

import { getSessionContext, hasBackofficeAccess } from "@/api/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/api/lib/supabase";
import type { Database } from "@/lib/database.types";
import { normalizeDbVerdict, optionalNumber, optionalText } from "@/api/incidents/utils";

type IncidentInsert = Database["public"]["Tables"]["incidents"]["Insert"];
type IncidentUpdate = Database["public"]["Tables"]["incidents"]["Update"];

function buildIncidentPayload(input: Record<string, unknown>): IncidentInsert {
  const analysis = typeof input.analysis === "object" && input.analysis !== null ? (input.analysis as Record<string, unknown>) : null;

  const payload: IncidentInsert = {
    contact: optionalText(input.contact),
    building_use: optionalText(input.building_use),
    build_year: optionalNumber(input.build_year),
    levels: optionalNumber(input.levels),
    basements: optionalNumber(input.basements),
    material: optionalText(input.material),
    terrain_type: optionalText(input.terrain_type),
    latitude: optionalNumber(input.latitude),
    longitude: optionalNumber(input.longitude),
    feedback: optionalText(input.feedback),
  };

  const maybeSet = (key: string, value: unknown) => {
    if (value !== null && value !== undefined) {
      (payload as Record<string, unknown>)[key] = value;
    }
  };

  maybeSet("state", optionalText(input.state));
  maybeSet("severity", normalizeDbVerdict(input.severity));
  maybeSet("ai_verdict", normalizeDbVerdict(input.ai_verdict));
  maybeSet("confidence", optionalNumber(input.confidence));
  maybeSet("finding", optionalText(input.finding));
  maybeSet("analysis_status", optionalText(input.analysis_status));
  maybeSet("assigned_to", optionalText(input.assigned_to));
  maybeSet("raw_ai", input.raw_ai ?? analysis);

  if (analysis) {
    maybeSet("ai_verdict", normalizeDbVerdict(analysis.verdict));
    maybeSet("severity", normalizeDbVerdict(input.severity) ?? normalizeDbVerdict(analysis.verdict));
    maybeSet("confidence", optionalNumber(analysis.confidence));
    maybeSet("finding", optionalText(analysis.finding));
    maybeSet("analysis_status", "complete");
    maybeSet("raw_ai", analysis);
  }

  return payload;
}

function buildPublicIncidentPayload(input: Record<string, unknown>): IncidentInsert {
  const analysis = typeof input.analysis === "object" && input.analysis !== null ? (input.analysis as Record<string, unknown>) : null;
  const verdict = normalizeDbVerdict(analysis?.verdict ?? input.ai_verdict) as IncidentInsert["ai_verdict"];

  return {
    contact: optionalText(input.contact),
    building_use: optionalText(input.building_use),
    build_year: optionalNumber(input.build_year),
    levels: optionalNumber(input.levels),
    basements: optionalNumber(input.basements),
    material: optionalText(input.material),
    terrain_type: optionalText(input.terrain_type),
    latitude: optionalNumber(input.latitude),
    longitude: optionalNumber(input.longitude),
    analysis_status: analysis ? "complete" : "pending",
    ai_verdict: verdict,
    severity: verdict,
    confidence: optionalNumber(analysis?.confidence ?? input.confidence),
    finding: optionalText(analysis?.finding ?? input.finding),
    raw_ai: (analysis ?? input.raw_ai ?? null) as IncidentInsert["raw_ai"],
    state: "pending",
  };
}

function buildUpdatePayload(input: Record<string, unknown>): IncidentUpdate {
  const payload: IncidentUpdate = {};
  const maybeSet = (key: string, value: unknown) => {
    if (value !== null && value !== undefined) {
      (payload as Record<string, unknown>)[key] = value;
    }
  };

  maybeSet("state", optionalText(input.state));
  maybeSet("severity", optionalText(input.severity));
  maybeSet("ai_verdict", optionalText(input.ai_verdict));
  maybeSet("confidence", optionalNumber(input.confidence));
  maybeSet("finding", optionalText(input.finding));
  maybeSet("analysis_status", optionalText(input.analysis_status));
  maybeSet("assigned_to", optionalText(input.assigned_to));
  maybeSet("feedback", optionalText(input.feedback));
  maybeSet("contact", optionalText(input.contact));
  maybeSet("building_use", optionalText(input.building_use));
  maybeSet("build_year", optionalNumber(input.build_year));
  maybeSet("levels", optionalNumber(input.levels));
  maybeSet("basements", optionalNumber(input.basements));
  maybeSet("material", optionalText(input.material));
  maybeSet("terrain_type", optionalText(input.terrain_type));
  maybeSet("latitude", optionalNumber(input.latitude));
  maybeSet("longitude", optionalNumber(input.longitude));

  return payload;
}

export async function incidentsGet(c: Context) {
  const { role } = await getSessionContext();

  if (!hasBackofficeAccess(role)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("id, state, severity, analysis_status, ai_verdict, confidence, finding, assigned_to, created_at, updated_at, contact, building_use, build_year, levels, basements, material, terrain_type, latitude, longitude, feedback")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ data });
}

export async function incidentsPost(c: Context) {
  let body: Record<string, unknown>;

  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  const { role } = await getSessionContext();
  const hasBackoffice = hasBackofficeAccess(role);
  const payload = hasBackoffice ? buildIncidentPayload(body) : buildPublicIncidentPayload(body);
  const hasContent = Object.values(payload).some((value) => value !== null && value !== undefined);

  if (!hasContent) {
    return c.json({ error: "Missing incident data." }, 400);
  }

  if (!hasBackoffice) {
    const incidentId = randomUUID();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("incidents").insert({ id: incidentId, ...payload });

    if (error) {
      return c.json({ error: error.message }, 403);
    }

    return c.json({
      data: {
        id: incidentId,
        analysis_status: payload.analysis_status ?? "pending",
        state: payload.state ?? "pending",
      },
    }, 201);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("incidents").insert(payload).select("*").single();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ data }, 201);
}

export async function incidentByIdGet(c: Context) {
  const { role } = await getSessionContext();
  if (!hasBackofficeAccess(role)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Missing incident id." }, 400);
  }

  const supabase = createSupabaseAdminClient();

  const [{ data: incident, error: incidentError }, { data: photos, error: photosError }] = await Promise.all([
    supabase.from("incidents").select("*").eq("id", id).maybeSingle(),
    supabase.from("incident_photos").select("*").eq("incident_id", id).order("position", { ascending: true }),
  ]);

  if (incidentError) {
    return c.json({ error: incidentError.message }, 500);
  }

  if (!incident) {
    return c.json({ error: "Not found" }, 404);
  }

  if (photosError) {
    return c.json({ error: photosError.message }, 500);
  }

  return c.json({ data: { ...incident, photos: photos ?? [] } });
}

export async function incidentByIdPut(c: Context) {
  const { role } = await getSessionContext();
  if (!hasBackofficeAccess(role)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Missing incident id." }, 400);
  }

  let body: Record<string, unknown>;

  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  const payload = buildUpdatePayload(body);
  if (Object.keys(payload).length === 0) {
    return c.json({ error: "Missing update data." }, 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("incidents").update(payload).eq("id", id).select("*").maybeSingle();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  if (!data) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ data });
}
