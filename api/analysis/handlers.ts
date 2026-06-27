import OpenAI from "openai";
import sharp from "sharp";
import type { Context } from "hono";

import { FORM_QUESTIONS, MAX_PHOTOS, type AnalysisResult, type PhotoResult, type VerdictLevel } from "@/lib/assessment";

const MODEL_FAST = "gpt-4.1-mini";
const MODEL_STRONG = "gpt-4.1";
const ESCALATION_CONFIDENCE_THRESHOLD = 70;

const VERDICT_SEVERITY: Record<VerdictLevel, number> = { low: 0, moderate: 1, severe: 2, critical: 3 };

function verdictSeverity(v: VerdictLevel): number {
  return VERDICT_SEVERITY[v];
}

function shouldEscalate(verdict: VerdictLevel, confidence: number): boolean {
  return verdictSeverity(verdict) >= VERDICT_SEVERITY.severe || confidence < ESCALATION_CONFIDENCE_THRESHOLD;
}

async function resizeImage(buffer: Buffer): Promise<string> {
  const resized = await sharp(buffer)
    .resize(768, 768, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return resized.toString("base64");
}

const SYSTEM_PROMPT = `Eres un asistente experto en evaluación de daños estructurales post-sismo.
Analiza la imagen de una estructura y responde ÚNICAMENTE con JSON compacto, sin texto adicional.

Esquema de respuesta:
{"verdict":"low"|"moderate"|"severe"|"critical","confidence":0-100,"finding":"texto breve en español"}

Criterios:
- low (Leve): Sin daños estructurales visibles o daños cosméticos
- moderate (Moderado): Grietas menores, daños superficiales, requiere inspección
- severe (Grave): Daños significativos en elementos portantes; el edificio debe ser evacuado hasta su reparación
- critical (Severo): Colapso parcial o inminente, deformación estructural, riesgo inmediato para la vida

El campo "finding" debe ser una oración corta describiendo lo observado. Sé conservador: ante la duda, escala el nivel.`;

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

async function analyzeImage(
  client: OpenAI,
  base64: string,
  model: string,
  contextBlock: string,
): Promise<{ verdict: VerdictLevel; confidence: number; finding: string }> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: 150,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "low" },
          },
          {
            type: "text",
            text: `Evalúa los daños estructurales de esta imagen.${contextBlock}`,
          },
        ],
      },
    ],
  });

  const raw = response.choices[0].message.content?.trim() ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Respuesta inesperada del modelo: ${raw}`);

  const parsed = JSON.parse(jsonMatch[0]);

  const verdict = (["low", "moderate", "severe", "critical"].includes(parsed.verdict)
    ? parsed.verdict
    : "moderate") as VerdictLevel;

  const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 50));
  const finding = String(parsed.finding || "Sin descripción disponible.");

  return { verdict, confidence, finding };
}

export async function analyzePost(c: Context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Servicio no configurado correctamente." }, 500);
  }

  const client = new OpenAI({ apiKey });

  let files: File[];
  let contextBlock = "";
  try {
    const formData = await c.req.raw.formData();
    files = formData.getAll("fotos") as File[];

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
  if (files.length > MAX_PHOTOS) {
    return c.json({ error: `Máximo ${MAX_PHOTOS} fotos por análisis.` }, 400);
  }

  const photoResults: PhotoResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();
    const original = Buffer.from(arrayBuffer);

    let base64: string;
    try {
      base64 = await resizeImage(original);
    } catch {
      base64 = original.slice(0, 1_000_000).toString("base64");
    }

    let result = await analyzeImage(client, base64, MODEL_FAST, contextBlock);
    let escalated = false;

    if (shouldEscalate(result.verdict, result.confidence)) {
      escalated = true;
      result = await analyzeImage(client, base64, MODEL_STRONG, contextBlock);
    }

    photoResults.push({ index: i, ...result, escalated });
  }

  const worstPhoto = photoResults.reduce((worst, current) =>
    verdictSeverity(current.verdict) > verdictSeverity(worst.verdict) ? current : worst,
  );

  const overallVerdict = worstPhoto.verdict;
  const overallConfidence = worstPhoto.confidence;

  const overallFinding =
    photoResults.length === 1
      ? worstPhoto.finding
      : `Peor caso detectado en foto ${worstPhoto.index + 1}: ${worstPhoto.finding}`;

  const result: AnalysisResult = {
    verdict: overallVerdict,
    confidence: overallConfidence,
    finding: overallFinding,
    perPhoto: photoResults,
    showAuthorities: overallVerdict !== "low",
  };

  return c.json(result);
}

