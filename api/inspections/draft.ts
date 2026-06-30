// Photo -> whole-planilla DRAFT (issue #30). "Cursor for structural damage":
// the model PERCEIVES observables (never verdicts), the deterministic grader
// (lib/rubric) assigns grades, and the draft is returned for the engineer to
// review/correct/attest. ADR §D4 (draft model), §D8 (no LLM millimeters).
//
// Photos are captured in three CATEGORIES (hard-scoped): each category produces
// ONLY its planilla section's output, so the model evaluates a photo as the kind
// of evidence the inspector labeled it.
//   exteriores    -> §2 external-axis flags only
//   estructurales -> §3/§4/§8 element grades only
//   otros         -> §10 non-structural component letters only

import OpenAI from "openai";
import sharp from "sharp";
import type { Context } from "hono";

import { getSessionContext, hasBackofficeAccess } from "@/api/lib/auth";
import { createSupabaseAdminClient } from "@/api/lib/supabase";
import type { Json } from "@/lib/database.types";
import {
  RUBRIC,
  RUBRIC_VERSION,
  gradeElement,
  isStructuralIndicator,
  type CrackBand,
  type ElementType,
  type StructuralIndicator,
} from "@/lib/rubric";

const MODEL_DRAFT = "gpt-4.1-mini";
const ELEMENT_TYPES = Object.keys(RUBRIC.elementTypes) as ElementType[];
const CRACK_BANDS: CrackBand[] = ["lt1", "1to2", "2to6", "6to10", "gt6", "gt10", "unknown"];

export type PhotoCategory = "exteriores" | "estructurales" | "otros";
export const PHOTO_CATEGORIES: PhotoCategory[] = ["exteriores", "estructurales", "otros"];

const ALL_INDICATORS = Array.from(
  new Set(
    Object.values(RUBRIC.elementTypes)
      .flatMap((r) => r.grades)
      .flatMap((g) => [...(g.requiredIndicators ?? []), ...(g.anyOfIndicators ?? [])]),
  ),
);

// ── per-category prompts (hard-scoped output) ─────────────────────────────────

function exterioresPrompt(): string {
  return `Eres un asistente de inspección post-sismo (Boletín ANIH Nº 61).
Estas son VISTAS EXTERNAS del edificio. Evalúa SOLO los ejes externos visibles. NO reportes
elementos estructurales internos. Para cada eje asigna a/b/c según lo que veas (a=sin/bajo,
b=moderado/medio, c=elevado/alto).

IMPORTANTE: si el eje NO es evaluable con estas fotos (no se ve el terreno, no hay vista de
los edificios contiguos, etc.), devuelve null para ese eje — NO asumas "a". Explica el motivo
en su nota. No inventes seguridad: "a" significa que VISTE que no hay peligro, no que no sabes.

ASENTAMIENTO e INCLINACIÓN son MEDICIONES de campo (cm / plomada d/60cm). Tú NO puedes medirlas
desde una foto, pero SÍ puedes marcar si VES indicios visibles (el edificio se ve inclinado,
hundido, fundaciones expuestas). Si ves un indicio, devuelve un flag a/b/c con la nota
"verificar con medición"; si no se aprecia, devuelve null. Nunca afirmes un valor medido.

USO PREDOMINANTE: infiere el uso del edificio desde las fotos (Vivienda / Comercio / Oficina /
Gubernamental / Educativo / Médico / Industrial / Religioso / Otros), o null si no es claro.

Responde ÚNICAMENTE con JSON, con una nota breve por eje:
{
  "externalFlags": {
    "colapso": "a"|"b"|"c"|null, "aledanos": "a"|"b"|"c"|null, "geologico": "a"|"b"|"c"|null,
    "asentamiento": "a"|"b"|"c"|null, "inclinacion": "a"|"b"|"c"|null
  },
  "notes": { "colapso": "...", "aledanos": "...", "geologico": "...", "asentamiento": "...", "inclinacion": "..." },
  "tipoEstructural": ${ELEMENT_TYPES.map((t) => `"${t}"`).join("|")}|null,
  "uso": "texto del uso predominante"|null
}`;
}

function estructuralesPrompt(): string {
  return `Eres un asistente de inspección post-sismo (Boletín ANIH Nº 61).
Estas son fotos de ELEMENTOS ESTRUCTURALES del piso crítico.

UN ELEMENTO POR MIEMBRO ESTRUCTURAL DISTINTO. Cada columna, cada viga, cada muro, cada nodo
es un elemento SEPARADO en "elements" — NUNCA combines dos miembros (p.ej. una columna y una
viga) en un solo elemento. Si una foto muestra una columna y una viga, son DOS elementos. Si
varias fotos muestran el MISMO miembro desde distintos ángulos, es UN solo elemento. Asigna un
"label" específico por miembro (p.ej. "Columna A-1", "Viga eje B"). El conteo de elementos
alimenta la Tabla 2, así que la separación correcta es importante.

Para CADA elemento reporta hechos observables, NO grados. NUNCA estimes milímetros: usa una
banda de estas opciones: ${CRACK_BANDS.join(", ")}.
Tipos válidos: ${ELEMENT_TYPES.join(", ")}.
Indicadores válidos (SOLO estos tokens): ${ALL_INDICATORS.join(", ")}.

CLAVE para concreto armado — distingue DAÑO SUPERFICIAL de DAÑO ESTRUCTURAL:
- "caida_recubrimiento" / "desconchado": se cayó el RECUBRIMIENTO o el acabado (friso/pintura)
  y quizá algo de concreto superficial, pero el elemento SIGUE ÍNTEGRO. Esto es daño de
  superficie/deterioro. Úsalo para spalling, acero expuesto por corrosión, friso caído.
- "caida_concreto": se perdió concreto ESTRUCTURAL del núcleo del elemento, el elemento está
  aplastado/colapsado/seccionado. Reserva esto SOLO para falla estructural real, NO para friso
  o recubrimiento caído. Si la viga/columna sigue en pie y solo perdió el recubrimiento, NO uses
  "caida_concreto".
- "grieta_pasante": la grieta CRUZA TODA LA SECCIÓN de lado a lado, o es diagonal atravesando
  todo el miembro (corte). Solo si efectivamente atraviesa el elemento completo.
El daño Severo requiere una grieta diagonal/pasante ACOMPAÑADA de ancho >2mm o desconchado; una
grieta fina sin desprendimiento es Moderada.

Responde ÚNICAMENTE con JSON — un objeto por CADA miembro estructural distinto:
{
  "elements": [
    {
      "label": "Columna A-1",
      "elementType": ${ELEMENT_TYPES.map((t) => `"${t}"`).join("|")},
      "crackBand": ${CRACK_BANDS.map((b) => `"${b}"`).join("|")},
      "indicators": ["token", ...],
      "photoQuality": "ok"|"low"|"unusable",
      "note": "breve descripción"
    },
    {
      "label": "Viga eje B",
      "elementType": "concreto_armado",
      "crackBand": "unknown",
      "indicators": ["caida_recubrimiento"],
      "photoQuality": "ok",
      "note": "..."
    }
  ]
}
Ante la duda, escala (reporta el indicador más severo que realmente observes).`;
}

function otrosPrompt(): string {
  return `Eres un asistente de inspección post-sismo (Boletín ANIH Nº 61).
Estas son fotos de ELEMENTOS NO ESTRUCTURALES (paredes/tabiquería, escaleras, tanques/balcones,
fachada/cielo raso). Evalúa el riesgo de cada componente visible en a/b/c (a=sin o poco daño,
b=grietas/separación, c=peligro de caída/colapso).

Responde ÚNICAMENTE con JSON:
{
  "nonStructural": [ { "component": "texto", "letter": "a"|"b"|"c", "note": "breve" } ]
}`;
}

// Suggest §7 recommended actions from the drafted damage. Values match the
// RECOMMENDATIONS / SECURITY_MEASURES constants in lib/planilla.ts exactly.
function suggestAcciones(draft: DraftPlanilla): string[] {
  const out = new Set<string>();
  const anySevere = draft.elements.some((e) => e.gradeAi === "severo" || e.gradeAi === "completo");
  const anyStructuralDamage = draft.elements.some((e) => e.gradeAi && e.gradeAi !== "sin_dano" && e.gradeAi !== "menor");
  const extC = (f: AxisFlag) => f === "c";
  const highRisk =
    anySevere ||
    extC(draft.externalFlags.colapso) ||
    extC(draft.externalFlags.aledanos) ||
    extC(draft.externalFlags.geologico) ||
    extC(draft.externalFlags.asentamiento) ||
    extC(draft.externalFlags.inclinacion);

  if (anyStructuralDamage) out.add("Inspección especializada: Estructura");
  if (extC(draft.externalFlags.geologico) || extC(draft.externalFlags.asentamiento)) {
    out.add("Inspección especializada: Geotecnia");
  }
  if (highRisk) {
    out.add("Restringir paso peatonal");
    out.add("Restringir tráfico vehicular");
  }
  if (extC(draft.externalFlags.aledanos)) out.add("Evaluar / evacuar edificio vecino");
  return [...out];
}

async function resizeImage(buffer: Buffer): Promise<string> {
  const resized = await sharp(buffer)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return resized.toString("base64");
}

function coerceElementType(v: unknown): ElementType | null {
  return typeof v === "string" && ELEMENT_TYPES.includes(v as ElementType) ? (v as ElementType) : null;
}
function coerceBand(v: unknown): CrackBand {
  return typeof v === "string" && CRACK_BANDS.includes(v as CrackBand) ? (v as CrackBand) : "unknown";
}
function coerceAbc(v: unknown): "a" | "b" | "c" | null {
  return v === "a" || v === "b" || v === "c" ? v : null;
}
function coerceIndicators(v: unknown): StructuralIndicator[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is StructuralIndicator => typeof x === "string" && isStructuralIndicator(x));
}

// ── draft shape ───────────────────────────────────────────────────────────────

export interface DraftElement {
  label: string | null;
  elementTypeAi: ElementType | null;
  gradeAi: string | null;
  crackBandAi: CrackBand;
  indicatorsAi: StructuralIndicator[];
  photoQuality: string | null;
  note: string | null;
}
export interface DraftNonStructural {
  component: string;
  letter: "a" | "b" | "c";
  note: string | null;
}
export type AxisFlag = "a" | "b" | "c" | null;
export interface DraftPlanilla {
  tipoEstructuralAi: ElementType | null;
  // Building use inferred from the photos (free text matched to a Uso chip).
  uso: string | null;
  externalFlags: {
    colapso: AxisFlag;
    aledanos: AxisFlag;
    geologico: AxisFlag;
    // Measurement axes: a visible-indication flag only ("verificar con medición").
    asentamiento: AxisFlag;
    inclinacion: AxisFlag;
  };
  externalNotes: {
    colapso: string | null;
    aledanos: string | null;
    geologico: string | null;
    asentamiento: string | null;
    inclinacion: string | null;
  };
  elements: DraftElement[];
  nonStructural: DraftNonStructural[];
  // Recommended actions (§7) suggested from the damage + computed risk.
  acciones: string[];
  rubricVersion: string;
}

async function runCategory(
  client: OpenAI,
  category: PhotoCategory,
  base64s: string[],
): Promise<{ raw: unknown; text: string }> {
  const prompt = category === "exteriores" ? exterioresPrompt() : category === "estructurales" ? estructuralesPrompt() : otrosPrompt();
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: `Analiza estas ${base64s.length} foto(s) de la categoría "${category}".` },
  ];
  for (const b of base64s) {
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b}`, detail: "high" } });
  }
  const response = await client.chat.completions.create({
    model: MODEL_DRAFT,
    max_tokens: 1200,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content },
    ],
  });
  const text = response.choices[0].message.content?.trim() ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  return { raw: match ? JSON.parse(match[0]) : {}, text };
}

export async function inspectionDraftPost(c: Context) {
  const { role } = await getSessionContext();
  if (!hasBackofficeAccess(role)) {
    return c.json({ error: "No autorizado." }, 403);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Servicio no configurado correctamente." }, 500);
  }

  // Photos arrive index-aligned with a `categories` JSON array.
  let files: File[];
  let categories: PhotoCategory[];
  let inspectionId: string | null = null;
  try {
    const formData = await c.req.raw.formData();
    files = formData.getAll("fotos") as File[];
    const rawCats = formData.get("categories");
    categories = typeof rawCats === "string" ? (JSON.parse(rawCats) as PhotoCategory[]) : [];
    const rawId = formData.get("inspection_id");
    if (typeof rawId === "string" && rawId.length > 0) inspectionId = rawId;
  } catch {
    return c.json({ error: "Error al leer el formulario." }, 400);
  }

  if (!files || files.length === 0) {
    return c.json({ error: "No se recibieron imágenes." }, 400);
  }
  if (categories.length !== files.length) {
    return c.json({ error: "Las fotos y sus categorías no coinciden." }, 400);
  }

  // Group base64-encoded photos by category.
  const byCategory: Record<PhotoCategory, string[]> = { exteriores: [], estructurales: [], otros: [] };
  for (let i = 0; i < files.length; i++) {
    const cat = PHOTO_CATEGORIES.includes(categories[i]) ? categories[i] : "estructurales";
    const buf = Buffer.from(await files[i].arrayBuffer());
    let base64: string;
    try {
      base64 = await resizeImage(buf);
    } catch {
      base64 = buf.slice(0, 1_000_000).toString("base64");
    }
    byCategory[cat].push(base64);
  }

  const client = new OpenAI({ apiKey });
  const startedAt = Date.now();

  const draft: DraftPlanilla = {
    tipoEstructuralAi: null,
    uso: null,
    externalFlags: { colapso: null, aledanos: null, geologico: null, asentamiento: null, inclinacion: null },
    externalNotes: { colapso: null, aledanos: null, geologico: null, asentamiento: null, inclinacion: null },
    elements: [],
    nonStructural: [],
    acciones: [],
    rubricVersion: RUBRIC_VERSION,
  };
  const rawByCategory: Record<string, unknown> = {};

  try {
    if (byCategory.exteriores.length > 0) {
      const { raw } = await runCategory(client, "exteriores", byCategory.exteriores);
      rawByCategory.exteriores = raw;
      const r = raw as {
        externalFlags?: Record<string, unknown>;
        notes?: Record<string, unknown>;
        tipoEstructural?: unknown;
        uso?: unknown;
      };
      draft.externalFlags = {
        colapso: coerceAbc(r.externalFlags?.colapso),
        aledanos: coerceAbc(r.externalFlags?.aledanos),
        geologico: coerceAbc(r.externalFlags?.geologico),
        asentamiento: coerceAbc(r.externalFlags?.asentamiento),
        inclinacion: coerceAbc(r.externalFlags?.inclinacion),
      };
      const note = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
      draft.externalNotes = {
        colapso: note(r.notes?.colapso),
        aledanos: note(r.notes?.aledanos),
        geologico: note(r.notes?.geologico),
        asentamiento: note(r.notes?.asentamiento),
        inclinacion: note(r.notes?.inclinacion),
      };
      draft.tipoEstructuralAi = coerceElementType(r.tipoEstructural);
      draft.uso = note(r.uso);
    }

    if (byCategory.estructurales.length > 0) {
      const { raw } = await runCategory(client, "estructurales", byCategory.estructurales);
      rawByCategory.estructurales = raw;
      const r = raw as { elements?: Array<Record<string, unknown>> };
      draft.elements = (r.elements ?? []).map((e) => {
        const elementType = coerceElementType(e.elementType);
        const crackBand = coerceBand(e.crackBand);
        const indicators = coerceIndicators(e.indicators);
        const gradeAi = elementType ? gradeElement(elementType, { crackBand, indicators }).grade : null;
        return {
          label: typeof e.label === "string" ? e.label : null,
          elementTypeAi: elementType,
          gradeAi,
          crackBandAi: crackBand,
          indicatorsAi: indicators,
          photoQuality: typeof e.photoQuality === "string" ? e.photoQuality : null,
          note: typeof e.note === "string" ? e.note : null,
        };
      });
      // If no explicit tipoEstructural came from exteriores, infer from elements.
      if (!draft.tipoEstructuralAi && draft.elements[0]?.elementTypeAi) {
        draft.tipoEstructuralAi = draft.elements[0].elementTypeAi;
      }
    }

    if (byCategory.otros.length > 0) {
      const { raw } = await runCategory(client, "otros", byCategory.otros);
      rawByCategory.otros = raw;
      const r = raw as { nonStructural?: Array<Record<string, unknown>> };
      draft.nonStructural = (r.nonStructural ?? [])
        .map((n) => ({
          component: typeof n.component === "string" ? n.component : "",
          letter: coerceAbc(n.letter),
          note: typeof n.note === "string" ? n.note : null,
        }))
        .filter((n): n is DraftNonStructural => n.letter !== null && n.component !== "");
    }
  } catch {
    return c.json({ error: "No se pudo generar el borrador del modelo." }, 502);
  }

  // §7 — suggest recommended actions deterministically from the observed damage.
  draft.acciones = suggestAcciones(draft);

  const latencyMs = Date.now() - startedAt;

  const supabase = createSupabaseAdminClient();
  await supabase.from("ai_drafts").insert({
    inspection_id: inspectionId,
    raw_output: { rawByCategory, draft } as unknown as Json,
    model_id: MODEL_DRAFT,
    prompt_version: RUBRIC_VERSION,
    latency_ms: latencyMs,
  });

  if (inspectionId) {
    await supabase.from("inspection_elements").delete().eq("inspection_id", inspectionId).eq("source", "ai_drafted");
    if (draft.elements.length > 0) {
      await supabase.from("inspection_elements").insert(
        draft.elements.map((e) => ({
          inspection_id: inspectionId!,
          element_label: e.label,
          source: "ai_drafted" as const,
          element_type_ai: e.elementTypeAi,
          grade_ai: (e.gradeAi as "menor" | "moderado" | "severo" | "completo" | null) ?? null,
          crack_band_ai: e.crackBandAi,
          indicators_ai: e.indicatorsAi,
          photo_quality: e.photoQuality,
        })),
      );
    }
  }

  return c.json({ data: draft });
}
