// Digital Boletín 61 planilla — UI vocabulary + client-side draft/attest state.
// Field labels and option sets are faithful to the paper instrument (§1–§14).
// The risk/etiqueta computation reuses the deterministic engine in lib/rubric
// (pure, client-safe), so the UI shows the SAME etiqueta the server persists.

import type { ElementType } from "@/lib/rubric";
import {
  computeEtiqueta,
  externalRisk,
  nonStructuralRisk,
  structuralRisk,
  type AbcLetter,
} from "@/lib/rubric";
import type { DamageGradeDb } from "@/lib/assessment";

export type Abc = AbcLetter;

// §3 — Uso de la edificación.
export const USO_OPTIONS = [
  "Gubernamental",
  "Bomberos",
  "Protección Civil",
  "Policial",
  "Militar",
  "Vivienda Popular",
  "Vivienda Unifamiliar",
  "Vivienda Multifamiliar",
  "Médico-Asistencial",
  "Educativo",
  "Deportivo-Recreativo",
  "Cultural",
  "Industrial",
  "Comercial",
  "Oficina",
  "Religioso",
  "Otros",
] as const;

// §4 — Tipo estructural (grouped; maps to rubric element types for grading).
export const TIPO_ESTRUCTURAL_OPTIONS: { value: ElementType; label: string }[] = [
  { value: "concreto_armado", label: "Concreto armado (pórticos / muros / prefab.)" },
  { value: "muro_concreto", label: "Muros de concreto armado" },
  { value: "acero", label: "Acero (pórticos / conexiones)" },
  { value: "mamposteria", label: "Mampostería (confinada / no confinada)" },
];

// §2 — external axes. The 3 visual ones get an AI flag; the 2 measured ones don't.
export const EXTERNAL_AXES = [
  { id: "colapso", label: "Colapso de la estructura", measured: false, opts: ["No", "Parcial", "Total"] },
  { id: "aledanos", label: "Peligro por edificios aledaños", measured: false, opts: ["No", "Moderado", "Elevado"] },
  { id: "geologico", label: "Peligro geológico / geotécnico", measured: false, opts: ["No", "Moderado", "Elevado"] },
  { id: "asentamiento", label: "Asentamiento del edificio", measured: true, opts: ["< 0,2m", "0,2m – 1m", "> 1m"] },
  { id: "inclinacion", label: "Inclinación (plomada d/60cm)", measured: true, opts: ["< 1cm", "1–2cm", "> 2cm"] },
] as const;

export type ExternalAxisId = (typeof EXTERNAL_AXES)[number]["id"];

// §10 — non-structural components.
export const NON_STRUCTURAL_COMPONENTS = [
  "Paredes / tabiquería",
  "Escaleras",
  "Tanques / balcones",
  "Fachada / cielo raso / antenas",
] as const;

export const ABC_AS_LETTER = ["a", "b", "c"] as const;
export const ABC_LABEL: Record<Abc, string> = { a: "a · Bajo", b: "b · Medio", c: "c · Alto" };

// §13 — medidas de seguridad.
export const SECURITY_MEASURES = [
  "Restringir paso peatonal",
  "Restringir tráfico vehicular",
  "Manejo de sustancias peligrosas",
  "Desconectar agua",
  "Desconectar energía",
  "Desconectar gas",
  "Apuntalar",
  "Demoler elementos a colapsar",
  "Evaluar / evacuar edificio vecino",
] as const;

// §12 — recomendaciones.
export const RECOMMENDATIONS = [
  "Inspección especializada: Estructura",
  "Inspección especializada: Geotecnia",
  "Inspección especializada: Servicios Públicos",
  "Intervención: PC o Bomberos",
  "Intervención: Policía / Ejército",
  "Intervención: Autoridades Municipales",
] as const;

// ── client-side planilla state ────────────────────────────────────────────────

export interface PlanillaElement {
  id: string;
  label: string;
  elementTypeAi: ElementType | null;
  elementTypeFinal: ElementType | null;
  gradeAi: DamageGradeDb | null;
  gradeFinal: DamageGradeDb | null;
  source: "ai_drafted" | "inspector_added";
  confirmed: boolean;
  photoQuality: string | null;
}

export interface PlanillaState {
  // §1/§2
  planillaNo: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  nivelPisos: number | null;
  semisotanos: number | null;
  sotanos: number | null;
  anioConstruccion: number | null;
  // §3/§4
  uso: string;
  usoAi: string | null; // the AI-suggested uso (for the IA tag)
  tipoEstructuralAi: ElementType | null;
  tipoEstructuralFinal: ElementType | null;
  // §2 external (final letters + AI flags)
  externalFinal: Partial<Record<ExternalAxisId, Abc>>;
  externalAi: Partial<Record<ExternalAxisId, Abc>>;
  // Whether the AI actually evaluated each axis (false = "no pudo evaluar").
  externalAiEvaluated: Partial<Record<ExternalAxisId, boolean>>;
  // The AI's per-axis justification note.
  externalNotes: Partial<Record<ExternalAxisId, string | null>>;
  // §8
  elements: PlanillaElement[];
  inspectedStructuralCount: number | null;
  // §10
  nonStructural: Partial<Record<string, Abc>>;
  // §11
  etiquetaOverride: "verde" | "amarilla" | "roja" | null;
  overrideReason: string;
  // §12/§13/§14
  recommendations: string[];
  securityMeasures: string[];
  observaciones: string;
}

/** Count of structural element rows (excludes mampostería) — the natural
 * default for the Tabla 2 denominator when the inspector hasn't overridden it. */
export function structuralElementCount(s: PlanillaState): number {
  return s.elements.filter((e) => e.elementTypeFinal && e.elementTypeFinal !== "mamposteria").length;
}

const GRADEABLE = (g: DamageGradeDb | null): g is "menor" | "moderado" | "severo" | "completo" =>
  !!g && g !== "sin_dano";

/** Live risk + etiqueta from the current planilla state (mirrors the server). */
export function computePlanillaEtiqueta(s: PlanillaState) {
  const externalLetters = EXTERNAL_AXES.map((a) => s.externalFinal[a.id]).filter(
    (l): l is Abc => l === "a" || l === "b" || l === "c",
  );

  const structuralGrades = s.elements
    .filter((e) => e.elementTypeFinal && e.elementTypeFinal !== "mamposteria")
    .map((e) => e.gradeFinal)
    .filter(GRADEABLE);

  const mamposteriaSignals: Abc[] = s.elements
    .filter((e) => e.elementTypeFinal === "mamposteria")
    .map((e) => (e.gradeFinal === "severo" || e.gradeFinal === "completo" ? "c" : e.gradeFinal === "moderado" ? "b" : "a"));
  const nonStructLetters = [
    ...NON_STRUCTURAL_COMPONENTS.map((c) => s.nonStructural[c]).filter((l): l is Abc => !!l),
    ...mamposteriaSignals,
  ];

  const struct = structuralRisk(structuralGrades, s.inspectedStructuralCount ?? (structuralElementCount(s) || undefined));
  const ext = externalRisk(externalLetters);
  const nonStruct = nonStructuralRisk(nonStructLetters);
  const { buildingRisk, etiqueta } = computeEtiqueta({
    external: ext,
    structural: struct.risk,
    nonStructural: nonStruct,
  });

  return {
    riesgoExterno: ext,
    riesgoEstructura: struct.risk,
    riesgoNoEstructural: nonStruct,
    shortCircuited: struct.shortCircuited,
    buildingRisk,
    etiqueta: s.etiquetaOverride ?? etiqueta,
    computedEtiqueta: etiqueta,
  };
}

export function emptyPlanilla(): PlanillaState {
  return {
    planillaNo: "",
    address: "",
    latitude: null,
    longitude: null,
    nivelPisos: null,
    semisotanos: null,
    sotanos: null,
    anioConstruccion: null,
    uso: "",
    usoAi: null,
    tipoEstructuralAi: null,
    tipoEstructuralFinal: null,
    externalFinal: {},
    externalAi: {},
    externalAiEvaluated: {},
    externalNotes: {},
    elements: [],
    inspectedStructuralCount: null,
    nonStructural: {},
    etiquetaOverride: null,
    overrideReason: "",
    recommendations: [],
    securityMeasures: [],
    observaciones: "",
  };
}
