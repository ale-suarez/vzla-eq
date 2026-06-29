// Photo -> whole-planilla DRAFT (issue #30). "Cursor for structural damage":
// the model PERCEIVES observables (never verdicts), the deterministic grader
// (lib/rubric) assigns grades, and the draft is returned for the engineer to
// review/correct/attest. ADR §D4 (draft model), §D8 (no LLM millimeters).

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

// The model emits observables keyed to the rubric vocabulary. The element
// type/indicator/band enums are injected so the model speaks the grader's tokens.
function buildSystemPrompt(): string {
  const indicatorList = Object.values(RUBRIC.elementTypes)
    .flatMap((r) => r.grades)
    .flatMap((g) => [...(g.requiredIndicators ?? []), ...(g.anyOfIndicators ?? [])]);
  const indicators = Array.from(new Set(indicatorList));

  return `Eres un asistente de inspección estructural post-sismo siguiendo el Boletín ANIH Nº 61.
Recibes fotos de UN edificio: una vista externa amplia y fotos de elementos del piso crítico.

Tu tarea es PERCIBIR hechos observables, NO emitir grados ni etiquetas. Para cada elemento
estructural fotografiado reporta lo que VES. NUNCA estimes milímetros exactos: reporta una
banda de ancho de grieta entre estas opciones: ${CRACK_BANDS.join(", ")}.

Tipos de elemento válidos: ${ELEMENT_TYPES.join(", ")}.
Indicadores válidos (usa SOLO estos tokens): ${indicators.join(", ")}.

Responde ÚNICAMENTE con JSON compacto:
{
  "tipoEstructural": ${ELEMENT_TYPES.map((t) => `"${t}"`).join("|")}|null,
  "externalFlags": {
    "colapso": "a"|"b"|"c"|null,
    "aledanos": "a"|"b"|"c"|null,
    "geologico": "a"|"b"|"c"|null
  },
  "elements": [
    {
      "label": "p.ej. Columna B-3",
      "elementType": ${ELEMENT_TYPES.map((t) => `"${t}"`).join("|")},
      "crackBand": ${CRACK_BANDS.map((b) => `"${b}"`).join("|")},
      "indicators": ["token", ...],
      "photoQuality": "ok"|"low"|"unusable",
      "note": "breve descripción de lo observado"
    }
  ]
}

Reglas:
- Las banderas externas (colapso/aledaños/geológico) son SEÑALES a verificar por el inspector,
  no grados definitivos. Inclinación y asentamiento NO los reportes: son mediciones de campo.
- Si una foto es de baja calidad, marca photoQuality y reporta lo que puedas; no inventes.
- Ante la duda, escala (reporta el indicador más severo que realmente observes).`;
}

async function resizeImage(buffer: Buffer): Promise<string> {
  const resized = await sharp(buffer)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return resized.toString("base64");
}

interface RawDraftElement {
  label?: string;
  elementType?: string;
  crackBand?: string;
  indicators?: string[];
  photoQuality?: string;
  note?: string;
}

interface RawDraft {
  tipoEstructural?: string | null;
  externalFlags?: { colapso?: string | null; aledanos?: string | null; geologico?: string | null };
  elements?: RawDraftElement[];
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

export interface DraftElement {
  label: string | null;
  elementTypeAi: ElementType | null;
  gradeAi: string | null;
  crackBandAi: CrackBand;
  indicatorsAi: StructuralIndicator[];
  photoQuality: string | null;
  note: string | null;
}

export interface DraftPlanilla {
  tipoEstructuralAi: ElementType | null;
  externalFlags: { colapso: "a" | "b" | "c" | null; aledanos: "a" | "b" | "c" | null; geologico: "a" | "b" | "c" | null };
  elements: DraftElement[];
  rubricVersion: string;
}

// Turn the model's raw observables into a draft: run each element through the
// deterministic grader to get gradeAi (the proposal). The LLM never grades.
function assembleDraft(raw: RawDraft): DraftPlanilla {
  const elements: DraftElement[] = (raw.elements ?? []).map((e) => {
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

  return {
    tipoEstructuralAi: coerceElementType(raw.tipoEstructural),
    externalFlags: {
      colapso: coerceAbc(raw.externalFlags?.colapso),
      aledanos: coerceAbc(raw.externalFlags?.aledanos),
      geologico: coerceAbc(raw.externalFlags?.geologico),
    },
    elements,
    rubricVersion: RUBRIC_VERSION,
  };
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

  let files: File[];
  let inspectionId: string | null = null;
  try {
    const formData = await c.req.raw.formData();
    files = formData.getAll("fotos") as File[];
    const rawId = formData.get("inspection_id");
    if (typeof rawId === "string" && rawId.length > 0) inspectionId = rawId;
  } catch {
    return c.json({ error: "Error al leer el formulario." }, 400);
  }

  if (!files || files.length === 0) {
    return c.json({ error: "No se recibieron imágenes." }, 400);
  }

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: `Analiza estas ${files.length} foto(s) del edificio y sus elementos.` },
  ];
  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    let base64: string;
    try {
      base64 = await resizeImage(buf);
    } catch {
      base64 = buf.slice(0, 1_000_000).toString("base64");
    }
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "high" } });
  }

  const client = new OpenAI({ apiKey });
  const startedAt = Date.now();
  let raw: RawDraft;
  let rawText = "";
  try {
    const response = await client.chat.completions.create({
      model: MODEL_DRAFT,
      max_tokens: 1200,
      temperature: 0,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content },
      ],
    });
    rawText = response.choices[0].message.content?.trim() ?? "";
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no-json");
    raw = JSON.parse(match[0]) as RawDraft;
  } catch {
    return c.json({ error: "No se pudo generar el borrador del modelo." }, 502);
  }
  const latencyMs = Date.now() - startedAt;

  const draft = assembleDraft(raw);

  // Persist the generation event (archive) + extract per-element predictions.
  const supabase = createSupabaseAdminClient();
  await supabase.from("ai_drafts").insert({
    inspection_id: inspectionId,
    raw_output: { rawText, parsed: raw, draft } as unknown as Json,
    model_id: MODEL_DRAFT,
    prompt_version: RUBRIC_VERSION,
    latency_ms: latencyMs,
  });

  // If attached to an existing inspection, write/overwrite the *_ai columns by
  // replacing AI-drafted element rows (latest draft wins; ADR §D7).
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
