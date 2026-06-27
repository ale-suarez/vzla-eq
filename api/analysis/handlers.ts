import OpenAI from "openai";
import sharp from "sharp";
import type { Context } from "hono";

import { MAX_PHOTOS, type AnalysisResult, type PhotoResult, type VerdictLevel } from "@/lib/assessment";

const MODEL_FAST = "gpt-4.1-mini";
const MODEL_STRONG = "gpt-4.1";
const ESCALATION_CONFIDENCE_THRESHOLD = 70;

function verdictSeverity(v: VerdictLevel): number {
  return v === "PELIGRO" ? 2 : v === "PRECAUCION" ? 1 : 0;
}

function shouldEscalate(verdict: VerdictLevel, confidence: number): boolean {
  return verdict === "PELIGRO" || confidence < ESCALATION_CONFIDENCE_THRESHOLD;
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
{"verdict":"SEGURO"|"PRECAUCION"|"PELIGRO","confidence":0-100,"finding":"texto breve en español"}

Criterios:
- SEGURO: Sin daños estructurales visibles
- PRECAUCION: Grietas menores, daños superficiales, requiere inspección
- PELIGRO: Grietas graves en elementos portantes, colapso parcial, deformación estructural, riesgo inminente

El campo "finding" debe ser una oración corta describiendo lo observado. Sé conservador: ante la duda, escala el nivel.`;

async function analyzeImage(
  client: OpenAI,
  base64: string,
  model: string,
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
            text: "Evalúa los daños estructurales de esta imagen.",
          },
        ],
      },
    ],
  });

  const raw = response.choices[0].message.content?.trim() ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Respuesta inesperada del modelo: ${raw}`);

  const parsed = JSON.parse(jsonMatch[0]);

  const verdict = (["SEGURO", "PRECAUCION", "PELIGRO"].includes(parsed.verdict)
    ? parsed.verdict
    : "PRECAUCION") as VerdictLevel;

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
  try {
    const formData = await c.req.raw.formData();
    files = formData.getAll("fotos") as File[];
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

    let result = await analyzeImage(client, base64, MODEL_FAST);
    let escalated = false;

    if (shouldEscalate(result.verdict, result.confidence)) {
      escalated = true;
      result = await analyzeImage(client, base64, MODEL_STRONG);
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
    showAuthorities: overallVerdict !== "SEGURO",
  };

  return c.json(result);
}

