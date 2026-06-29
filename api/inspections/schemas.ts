import { z } from "@hono/zod-openapi";

// Inspection (digital Boletín 61 planilla) request DTOs. ADR §D7; issue #29.
// The etiqueta and section risks are NOT accepted from the client — they are
// computed server-side from the attested fields (deterministic, §D2).

const abc = z.enum(["a", "b", "c"]);
const elementTypeSchema = z.enum(["concreto_armado", "muro_concreto", "mamposteria", "acero"]);
const damageGradeSchema = z.enum(["sin_dano", "menor", "moderado", "severo", "completo"]);
const crackBandSchema = z.enum(["lt1", "1to2", "2to6", "6to10", "gt6", "gt10", "unknown"]);

export const inspectionElementInputSchema = z.object({
  elementLabel: z.string().optional(),
  source: z.enum(["ai_drafted", "inspector_added"]).default("inspector_added"),
  elementTypeAi: elementTypeSchema.nullish(),
  elementTypeFinal: elementTypeSchema,
  gradeAi: damageGradeSchema.nullish(),
  gradeFinal: damageGradeSchema.nullish(),
  crackBandAi: crackBandSchema.nullish(),
  crackBandFinal: crackBandSchema.nullish(),
  indicatorsAi: z.array(z.string()).default([]),
  indicatorsFinal: z.array(z.string()).default([]),
  observablesExtra: z.record(z.string(), z.unknown()).nullish(),
  confirmed: z.boolean().default(false),
  photoRefs: z.array(z.string()).default([]),
  photoQuality: z.string().nullish(),
});

export const inspectionInputSchema = z.object({
  planillaNo: z.string().optional(),
  inspectorIds: z.array(z.string().uuid()).default([]),

  address: z.string().optional(),
  estado: z.string().optional(),
  municipio: z.string().optional(),
  parroquia: z.string().optional(),
  sector: z.string().optional(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  coordUtmX: z.number().nullish(),
  coordUtmY: z.number().nullish(),
  utmHuso: z.string().nullish(),

  uso: z.string().optional(),
  nivelPisos: z.number().int().nullish(),
  semisotanos: z.number().int().nullish(),
  sotanos: z.number().int().nullish(),
  anioConstruccion: z.number().int().nullish(),
  tipoEstructuralAi: elementTypeSchema.nullish(),
  tipoEstructuralFinal: elementTypeSchema.nullish(),

  // §2 external axes (final = attested). AI flags optional.
  extColapsoAi: abc.nullish(),
  extColapsoFinal: abc.nullish(),
  extAledanosAi: abc.nullish(),
  extAledanosFinal: abc.nullish(),
  extGeologicoAi: abc.nullish(),
  extGeologicoFinal: abc.nullish(),
  extAsentamientoFinal: abc.nullish(),
  extInclinacionFinal: abc.nullish(),

  // §5 non-structural component letters (attested).
  nonStructuralLetters: z.array(abc).default([]),

  // critical-floor structural element count denominator (Tabla 2). Optional;
  // defaults to the count of structural element rows when omitted.
  inspectedStructuralCount: z.number().int().positive().nullish(),

  croquisRef: z.string().nullish(),
  observaciones: z.string().nullish(),

  etiquetaOverride: z.enum(["verde", "amarilla", "roja"]).nullish(),
  overrideReason: z.string().nullish(),

  submit: z.boolean().default(false),

  elements: z.array(inspectionElementInputSchema).default([]),
});

export type InspectionInput = z.infer<typeof inspectionInputSchema>;
export type InspectionElementInput = z.infer<typeof inspectionElementInputSchema>;
