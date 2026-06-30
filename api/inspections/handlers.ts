import type { Context } from "hono";

import { getSessionContext, hasBackofficeAccess } from "@/api/lib/auth";
import { createSupabaseAdminClient } from "@/api/lib/supabase";
import {
  computeEtiqueta,
  externalRisk,
  nonStructuralRisk,
  structuralRisk,
  type AbcLetter,
} from "@/lib/rubric";
import type { DamageGrade } from "@/lib/rubric";
import type { Json } from "@/lib/database.types";
import { inspectionInputSchema, type InspectionInput } from "@/api/inspections/schemas";

// Section risks + etiqueta are ALWAYS computed here from the attested fields —
// never trusted from the client. This is the deterministic compliance step (§D2).
function computeRisks(input: InspectionInput) {
  // §2 external — attested letters only (asentamiento/inclinación are inspector
  // measurements; the visible axes use the final letter when present).
  const externalLetters = [
    input.extColapsoFinal,
    input.extAledanosFinal,
    input.extGeologicoFinal,
    input.extAsentamientoFinal,
    input.extInclinacionFinal,
  ].filter((l): l is AbcLetter => l === "a" || l === "b" || l === "c");

  // §3/§4 structural — grades of the structural-axis elements (concreto/acero/muro).
  // mampostería is non-structural per the rubric, handled in §5 below.
  const structuralGrades = input.elements
    .filter((e) => e.elementTypeFinal !== "mamposteria")
    .map((e) => e.gradeFinal)
    .filter((g): g is DamageGrade => !!g && g !== "sin_dano");

  // §5 non-structural — explicit component letters + any mampostería element
  // graded severo/completo contributes an 'alto' signal.
  const mamposteriaSignals: AbcLetter[] = input.elements
    .filter((e) => e.elementTypeFinal === "mamposteria")
    .map((e) => (e.gradeFinal === "severo" || e.gradeFinal === "completo" ? "c" : e.gradeFinal === "moderado" ? "b" : "a"));
  const nonStructLetters = [...input.nonStructuralLetters, ...mamposteriaSignals];

  // Default the Tabla 2 denominator to the count of structural element rows
  // (matches the client default) when the inspector did not override it.
  const structuralRowCount = input.elements.filter((e) => e.elementTypeFinal !== "mamposteria").length;
  const struct = structuralRisk(structuralGrades, input.inspectedStructuralCount ?? (structuralRowCount || undefined));
  const ext = externalRisk(externalLetters);
  const nonStruct = nonStructuralRisk(nonStructLetters);
  const { etiqueta } = computeEtiqueta({ external: ext, structural: struct.risk, nonStructural: nonStruct });

  return { ext, struct, nonStruct, etiqueta };
}

function toRow(input: InspectionInput, userId: string | null) {
  const { ext, struct, nonStruct, etiqueta } = computeRisks(input);
  const overridden = !!input.etiquetaOverride && input.etiquetaOverride !== etiqueta;

  return {
    planilla_no: input.planillaNo ?? null,
    created_by: userId,
    inspector_ids: input.inspectorIds,
    address: input.address ?? null,
    estado: input.estado ?? null,
    municipio: input.municipio ?? null,
    parroquia: input.parroquia ?? null,
    sector: input.sector ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    coord_utm_x: input.coordUtmX ?? null,
    coord_utm_y: input.coordUtmY ?? null,
    utm_huso: input.utmHuso ?? null,
    uso: input.uso ?? null,
    nivel_pisos: input.nivelPisos ?? null,
    semisotanos: input.semisotanos ?? null,
    sotanos: input.sotanos ?? null,
    anio_construccion: input.anioConstruccion ?? null,
    tipo_estructural_ai: input.tipoEstructuralAi ?? null,
    tipo_estructural_final: input.tipoEstructuralFinal ?? null,
    ext_colapso_ai: input.extColapsoAi ?? null,
    ext_colapso_final: input.extColapsoFinal ?? null,
    ext_aledanos_ai: input.extAledanosAi ?? null,
    ext_aledanos_final: input.extAledanosFinal ?? null,
    ext_geologico_ai: input.extGeologicoAi ?? null,
    ext_geologico_final: input.extGeologicoFinal ?? null,
    ext_asentamiento_final: input.extAsentamientoFinal ?? null,
    ext_inclinacion_final: input.extInclinacionFinal ?? null,
    riesgo_externo: ext,
    riesgo_estructura: struct.risk,
    riesgo_no_estructural: nonStruct,
    etiqueta: input.etiquetaOverride ?? etiqueta,
    etiqueta_overridden: overridden,
    override_reason: overridden ? input.overrideReason ?? null : null,
    croquis_ref: input.croquisRef ?? null,
    observaciones: input.observaciones ?? null,
    rubric_version: "anih-61-2023.1",
    submitted_at: input.submit ? new Date().toISOString() : null,
  };
}

function toElementRows(input: InspectionInput, inspectionId: string) {
  return input.elements.map((e) => ({
    inspection_id: inspectionId,
    element_label: e.elementLabel ?? null,
    source: e.source,
    element_type_ai: e.elementTypeAi ?? null,
    element_type_final: e.elementTypeFinal,
    grade_ai: e.gradeAi ?? null,
    grade_final: e.gradeFinal ?? null,
    crack_band_ai: e.crackBandAi ?? null,
    crack_band_final: e.crackBandFinal ?? null,
    indicators_ai: e.indicatorsAi,
    indicators_final: e.indicatorsFinal,
    observables_extra: (e.observablesExtra ?? null) as Json,
    confirmed: e.confirmed,
    photo_refs: e.photoRefs,
    photo_quality: e.photoQuality ?? null,
  }));
}

export async function inspectionsPost(c: Context) {
  const { role, user } = await getSessionContext();
  if (!hasBackofficeAccess(role)) {
    return c.json({ error: "No autorizado." }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  const parsed = inspectionInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Datos de inspección inválidos.", details: parsed.error.flatten() }, 400);
  }

  const supabase = createSupabaseAdminClient();

  const { data: inspection, error } = await supabase
    .from("inspections")
    .insert(toRow(parsed.data, user?.id ?? null))
    .select("id")
    .single();

  if (error || !inspection) {
    return c.json({ error: error?.message ?? "No se pudo crear la inspección." }, 400);
  }

  if (parsed.data.elements.length > 0) {
    const { error: elError } = await supabase
      .from("inspection_elements")
      .insert(toElementRows(parsed.data, inspection.id));
    if (elError) {
      return c.json({ error: elError.message }, 400);
    }
  }

  return c.json({ data: { id: inspection.id } }, 201);
}

export async function inspectionByIdGet(c: Context) {
  const { role } = await getSessionContext();
  if (!hasBackofficeAccess(role)) {
    return c.json({ error: "No autorizado." }, 403);
  }
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Missing inspection id." }, 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data: inspection, error } = await supabase.from("inspections").select("*").eq("id", id).single();
  if (error) {
    return c.json({ error: error.message }, error.code === "PGRST116" ? 404 : 500);
  }

  const { data: elements, error: elError } = await supabase
    .from("inspection_elements")
    .select("*")
    .eq("inspection_id", id);
  if (elError) {
    return c.json({ error: elError.message }, 500);
  }

  return c.json({ data: { ...inspection, elements: elements ?? [] } });
}
