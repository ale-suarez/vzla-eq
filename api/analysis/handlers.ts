import OpenAI from "openai";
import sharp from "sharp";
import type { Context } from "hono";

import {
  FORM_QUESTIONS,
  MAX_PHOTOS,
  TRIAD_SLOTS,
  confidenceCapForTriadViews,
  photoTypeLabel,
  type AnalysisResult,
  type Observation,
  type PhotoGating,
  type PhotoIssue,
  type PhotoMeta,
  type PhotoTier,
  type PhotoType,
  type VerdictLevel,
} from "@/lib/assessment";

const MODEL_FAST = "gpt-4.1-mini";
const MODEL_STRONG = "gpt-4.1";
const ESCALATION_CONFIDENCE_THRESHOLD = 70;

const VERDICT_SEVERITY: Record<VerdictLevel, number> = { menor: 0, moderado: 1, severo: 2, completo: 3 };

function verdictSeverity(v: VerdictLevel): number {
  return VERDICT_SEVERITY[v];
}

function shouldEscalate(verdict: VerdictLevel, confidence: number): boolean {
  return verdictSeverity(verdict) >= VERDICT_SEVERITY.severo || confidence < ESCALATION_CONFIDENCE_THRESHOLD;
}

// Issues that make a photo irrelevant noise rather than weak evidence: the
// photo is dropped (not fed to the verdict). Quality issues (blurry/dark/
// wrong_distance) instead degrade — the view still counts but lowers confidence.
const DROP_ISSUES = new Set<PhotoIssue>(["irrelevant", "inappropriate"]);

async function resizeImage(buffer: Buffer): Promise<string> {
  const resized = await sharp(buffer)
    .resize(768, 768, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return resized.toString("base64");
}

const SYSTEM_PROMPT = `Eres un asistente experto en evaluación de daños estructurales post-sismo.
Recibes un CONJUNTO de fotos que documentan UN SOLO daño desde varias vistas. Las vistas
de la tríada principal son: "Vista general" (contexto del ambiente), "Vista intermedia"
(la zona del daño) y "Acercamiento" (detalle con referencia de tamaño). Puede haber fotos
suplementarias (exterior, columna, puerta/ventana, otro).

Tu tarea es PRE-analizar el conjunto COMPLETO con contexto, no evaluar cada foto por
separado. Razona a través de las vistas: usa la vista general para el contexto, la
intermedia para ubicar el daño, y EL ACERCAMIENTO para decidir si la grieta atraviesa el
sustrato (daño estructural) o es solo la capa de pintura (cosmético).

Primero evalúa cada foto: si está borrosa, oscura o a distancia equivocada márcala con el
problema correspondiente (sigue siendo evidencia débil). Si es irrelevante o inapropiada
(no muestra la estructura), márcala y NO la uses como evidencia.

Responde ÚNICAMENTE con JSON compacto, sin texto adicional, con ESTE orden de campos:
{
  "photos": [{"index":n,"usable":bool,"issue":"blurry"|"dark"|"wrong_distance"|"irrelevant"|"inappropriate"|null}],
  "observations": [{"index":n,"seen":"qué muestra esa vista (solo fotos válidas)"}],
  "paintingVsStructural": "juicio del acercamiento: ¿la grieta cruza el sustrato o solo la pintura? (null si no hay acercamiento válido)",
  "verdict": "menor"|"moderado"|"severo"|"completo",
  "confidence": 0-100,
  "finding": "oración breve en español describiendo el daño del conjunto"
}

Escala de veredicto:
- menor (Menor): Sin daños estructurales visibles o daños cosméticos.
- moderado (Moderado): Grietas menores, daños superficiales, requiere inspección.
- severo (Severo): Daños significativos en elementos portantes; evacuar hasta reparación.
- completo (Completo): Colapso parcial o inminente, riesgo inmediato para la vida.

Completa "observations" y "paintingVsStructural" ANTES de decidir el veredicto: el
veredicto debe ser la conclusión de leer las vistas en conjunto. Sé conservador: ante la
duda, escala el nivel.`;

// Builds a citizen-reported context block from the questionnaire answers.
// Blank answers are skipped, so an empty form yields an empty string (no
// context is added to the prompt). Phone/address are intentionally excluded.
function buildContextBlock(questions: Record<string, string>): string {
  const lines = FORM_QUESTIONS.flatMap((q) => {
    const answer = questions[q.id]?.trim();
    return answer ? [`- ${q.question} ${answer}`] : [];
  });

  if (lines.length === 0) {
    return "";
  }

  return [
    "",
    "Contexto reportado por el ciudadano (puede ser impreciso; prioriza la evidencia visual):",
    ...lines,
  ].join("\n");
}

interface PreparedPhoto {
  index: number;
  meta: PhotoMeta;
  base64: string;
}

interface RawPhotoFlag {
  index: number;
  usable: boolean;
  issue: PhotoIssue;
}

interface RawObservation {
  index: number;
  seen: string;
}

interface ModelResponse {
  photos: PhotoGating[];
  observations: Observation[];
  paintingVsStructural: string | null;
  verdict: VerdictLevel;
  confidence: number;
  finding: string;
}

function normalizeIssue(value: unknown): PhotoIssue {
  const allowed: PhotoIssue[] = ["blurry", "dark", "wrong_distance", "irrelevant", "inappropriate"];
  return allowed.includes(value as PhotoIssue) ? (value as PhotoIssue) : null;
}

// Builds the multi-image user message: a captioned text block per photo, in
// order, so the model knows which view each image represents.
function buildUserContent(photos: PreparedPhoto[], contextBlock: string) {
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Analiza el siguiente conjunto de ${photos.length} foto(s) que documentan un mismo daño.${contextBlock}`,
    },
  ];

  for (const photo of photos) {
    content.push({
      type: "text",
      text: `Foto ${photo.index} — ${photoTypeLabel(photo.meta.type)}${
        photo.meta.tier === "supplementary" ? " (suplementaria)" : ""
      }:`,
    });
    content.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${photo.base64}`, detail: "low" },
    });
  }

  return content;
}

// Runs one analysis pass over the WHOLE captioned set and parses the
// chain-of-evidence JSON into per-photo gating + an aggregate verdict.
async function analyzeSet(
  client: OpenAI,
  photos: PreparedPhoto[],
  model: string,
  contextBlock: string,
): Promise<ModelResponse> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: 700,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserContent(photos, contextBlock) },
    ],
  });

  const raw = response.choices[0].message.content?.trim() ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Respuesta inesperada del modelo: ${raw}`);

  const parsed = JSON.parse(jsonMatch[0]) as {
    photos?: RawPhotoFlag[];
    observations?: RawObservation[];
    paintingVsStructural?: string | null;
    verdict?: string;
    confidence?: number;
    finding?: string;
  };

  const metaByIndex = new Map(photos.map((p) => [p.index, p.meta]));

  // Map the model's per-photo flags back onto the known tier/type. Any photo
  // the model omitted is assumed usable with no issue.
  const flagByIndex = new Map<number, RawPhotoFlag>();
  for (const flag of parsed.photos ?? []) {
    if (typeof flag?.index === "number") flagByIndex.set(flag.index, flag);
  }

  const gating: PhotoGating[] = photos.map((p) => {
    const flag = flagByIndex.get(p.index);
    const issue = normalizeIssue(flag?.issue);
    const usable = flag ? Boolean(flag.usable) && !DROP_ISSUES.has(issue) : true;
    return {
      index: p.index,
      tier: p.meta.tier,
      viewType: p.meta.type,
      usable,
      issue,
    };
  });

  const observations: Observation[] = (parsed.observations ?? []).flatMap((o) => {
    const meta = typeof o?.index === "number" ? metaByIndex.get(o.index) : undefined;
    const seen = typeof o?.seen === "string" ? o.seen.trim() : "";
    return meta && seen ? [{ viewType: meta.type, seen }] : [];
  });

  const verdict = (["menor", "moderado", "severo", "completo"].includes(parsed.verdict ?? "")
    ? parsed.verdict
    : "moderado") as VerdictLevel;

  const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 50));
  const finding = String(parsed.finding || "Sin descripción disponible.");
  const paintingVsStructural =
    typeof parsed.paintingVsStructural === "string" && parsed.paintingVsStructural.trim()
      ? parsed.paintingVsStructural.trim()
      : null;

  return { photos: gating, observations, paintingVsStructural, verdict, confidence, finding };
}

/** Number of valid TRIAD views among the gating results (0-3). */
function countValidTriadViews(gating: PhotoGating[]): number {
  return gating.filter((g) => g.tier === "triad" && g.usable).length;
}

/** Any usable photo (triad or supplementary) counts toward the evidence floor. */
function hasAnyValidView(gating: PhotoGating[]): boolean {
  return gating.some((g) => g.usable);
}

function parsePhotoMeta(raw: unknown): PhotoMeta[] | null {
  if (!Array.isArray(raw)) return null;
  const validTiers: PhotoTier[] = ["triad", "supplementary"];
  const out: PhotoMeta[] = [];
  for (const item of raw) {
    const tier = (item as { tier?: unknown })?.tier;
    const type = (item as { type?: unknown })?.type;
    if (typeof type !== "string" || !validTiers.includes(tier as PhotoTier)) return null;
    out.push({ tier: tier as PhotoTier, type: type as PhotoType });
  }
  return out;
}

export async function analyzePost(c: Context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Servicio no configurado correctamente." }, 500);
  }

  const client = new OpenAI({ apiKey });

  let files: File[];
  let meta: PhotoMeta[];
  let contextBlock = "";
  try {
    const formData = await c.req.raw.formData();
    files = formData.getAll("fotos") as File[];

    const rawMeta = formData.get("photo_meta");
    const parsedMeta = typeof rawMeta === "string" ? parsePhotoMeta(JSON.parse(rawMeta)) : null;
    if (!parsedMeta) {
      return c.json({ error: "Metadatos de fotos inválidos." }, 400);
    }
    meta = parsedMeta;

    const rawForm = formData.get("form");
    if (typeof rawForm === "string" && rawForm.length > 0) {
      const parsed = JSON.parse(rawForm) as { questions?: Record<string, string> };
      contextBlock = buildContextBlock(parsed.questions ?? {});
    }
  } catch {
    return c.json({ error: "Error al leer el formulario." }, 400);
  }

  if (!files || files.length === 0) {
    return c.json({ error: "No se recibieron imágenes." }, 400);
  }
  if (files.length !== meta.length) {
    return c.json({ error: "Las fotos y sus metadatos no coinciden." }, 400);
  }
  if (files.length > MAX_PHOTOS) {
    return c.json({ error: `Máximo ${MAX_PHOTOS} fotos por análisis.` }, 400);
  }

  // The three triad views are required to submit (enforced client-side too).
  const triadTypes = new Set(meta.filter((m) => m.tier === "triad").map((m) => m.type));
  const missing = TRIAD_SLOTS.filter((slot) => !triadTypes.has(slot.type));
  if (missing.length > 0) {
    return c.json(
      { error: `Faltan vistas obligatorias: ${missing.map((m) => m.title).join(", ")}.` },
      400,
    );
  }

  const prepared: PreparedPhoto[] = [];
  for (let i = 0; i < files.length; i++) {
    const arrayBuffer = await files[i].arrayBuffer();
    const original = Buffer.from(arrayBuffer);
    let base64: string;
    try {
      base64 = await resizeImage(original);
    } catch {
      base64 = original.slice(0, 1_000_000).toString("base64");
    }
    prepared.push({ index: i, meta: meta[i], base64 });
  }

  // Single contextual pass over the whole set; escalate the SAME set to the
  // strong model on severe/low-confidence. The confidence cap (thin triad
  // evidence) is applied BEFORE the escalation check, so thin-evidence reports
  // fall under the threshold and auto-escalate to the strong model.
  let analysis = await analyzeSet(client, prepared, MODEL_FAST, contextBlock);
  let effectiveConfidence = Math.min(
    analysis.confidence,
    confidenceCapForTriadViews(countValidTriadViews(analysis.photos)),
  );
  if (shouldEscalate(analysis.verdict, effectiveConfidence)) {
    analysis = await analyzeSet(client, prepared, MODEL_STRONG, contextBlock);
    effectiveConfidence = Math.min(
      analysis.confidence,
      confidenceCapForTriadViews(countValidTriadViews(analysis.photos)),
    );
  }

  // No usable evidence at all => no verdict; ask for a retake / reject abuse.
  if (!hasAnyValidView(analysis.photos)) {
    const result: AnalysisResult = {
      verdict: null,
      confidence: 0,
      finding: "No se pudo analizar: ninguna foto es utilizable. Vuelve a tomar las fotos.",
      observations: [],
      paintingVsStructural: null,
      photos: analysis.photos,
      validTriadViews: 0,
      showAuthorities: false,
    };
    return c.json(result);
  }

  // Confidence already capped by valid triad-view count (effectiveConfidence).
  const validTriadViews = countValidTriadViews(analysis.photos);

  const result: AnalysisResult = {
    verdict: analysis.verdict,
    confidence: effectiveConfidence,
    finding: analysis.finding,
    observations: analysis.observations,
    paintingVsStructural: analysis.paintingVsStructural,
    photos: analysis.photos,
    validTriadViews,
    showAuthorities: analysis.verdict !== "menor",
  };

  return c.json(result);
}
