// Rubric artifact — the single source of truth for damage grading, extracted
// from Boletín ANIH Nº 61 (Manual de Campo + Figs 11–23).
//
// Consumed by: (1) the LLM draft prompt, (2) the deterministic grader
// (lib/rubric/grade.ts), and (3) aggregation. ADR 0001-digital-boletin-61 §D6.
//
// The boletín is heterogeneous: crack-width numbers differ per element type, some
// types have no width numbers at all (steel), and infill/relleno is non-structural
// on a different aggregation axis. The artifact encodes each type's own rubric.

import type { DamageGrade } from "./taxonomy";
import type { CrackBand, StructuralIndicator } from "./indicators";
import { CRACK_BAND_MM } from "./indicators";

export const RUBRIC_VERSION = "anih-61-2023.1";
export const RUBRIC_SOURCE = "Boletín ANIH Nº 61, Oct–Dic 2023 (Manual de Campo)";

/** Element types the planilla grades, mapped to their aggregation axis. */
export type ElementType =
  | "concreto_armado" // columna, viga, losa, techo, unión — concreto armado
  | "muro_concreto" // muro de concreto armado
  | "mamposteria" // muro portante / paredes de relleno — mampostería
  | "acero"; // columna, viga, unión — acero

export type AggregationAxis = "structural" | "non_structural";

/**
 * A grade definition. A grade matches when:
 *   - crackWidthMm range (if present) contains the observed band, AND
 *   - all `requiredIndicators` are present (if any), AND
 *   - at least one `anyOfIndicators` is present (if that list is non-empty).
 * `qualitative: true` marks grades with no numeric width (steel), matched on
 * indicators alone.
 */
export interface GradeDef {
  grade: DamageGrade;
  /** Inclusive-min / exclusive-max in mm; null bound = open-ended. Omitted = no width criterion. */
  crackWidthMm?: { min: number | null; max: number | null };
  requiredIndicators?: StructuralIndicator[];
  anyOfIndicators?: StructuralIndicator[];
  qualitative?: boolean;
  /** Boletín figure / section this grade definition comes from (audit trail). */
  sourceFigure: string;
}

export interface ElementRubric {
  elementType: ElementType;
  axis: AggregationAxis;
  /** Human label for the planilla / prompt. */
  label: string;
  /** Ordered menor → completo. Grader evaluates worst-first. */
  grades: GradeDef[];
}

export interface RubricArtifact {
  version: string;
  source: string;
  elementTypes: Record<ElementType, ElementRubric>;
}

// Manual de Campo consolidated table:
//
//  Concreto armado  | <1mm        | 1–2mm                 | >2mm + caída recubr. + pandeo/fractura barras + despl. residual
//  Muro concreto    | <2mm        | 2–6mm                 | >6mm + caída recubr. + pandeo/fractura barras + despl. residual
//  Mampostería      | <1mm        | 1–10mm + diagonales   | derrumbe parcial/total de la pared
//                   |             | + desprendimiento     |
//  Acero            | deform.     | pandeo incipiente     | pandeo local, fractura sección/soldadura/placa base
//                   | imperceptib.|                       |
//
// "Completo" is the worst tier of Severo/Completo, split out per Figs 11d/15d/22c.

export const RUBRIC: RubricArtifact = {
  version: RUBRIC_VERSION,
  source: RUBRIC_SOURCE,
  elementTypes: {
    concreto_armado: {
      elementType: "concreto_armado",
      axis: "structural",
      label: "Columna / Viga / Losa / Nodo (concreto armado)",
      grades: [
        { grade: "menor", crackWidthMm: { min: 0, max: 1 }, sourceFigure: "Fig 11a / Manual de Campo" },
        { grade: "moderado", crackWidthMm: { min: 1, max: 2 }, sourceFigure: "Fig 11b / Manual de Campo" },
        {
          grade: "severo",
          crackWidthMm: { min: 2, max: null },
          anyOfIndicators: ["caida_recubrimiento", "desconchado", "acero_expuesto"],
          sourceFigure: "Fig 11c / Manual de Campo",
        },
        {
          grade: "completo",
          anyOfIndicators: ["pandeo_barras", "fractura_barras", "acortamiento_columna", "caida_concreto", "desplazamiento_residual"],
          sourceFigure: "Fig 11d / Manual de Campo",
        },
      ],
    },
    muro_concreto: {
      elementType: "muro_concreto",
      axis: "structural",
      label: "Muro de concreto armado",
      grades: [
        { grade: "menor", crackWidthMm: { min: 0, max: 2 }, sourceFigure: "Fig 17a / Manual de Campo" },
        { grade: "moderado", crackWidthMm: { min: 2, max: 6 }, sourceFigure: "Fig 17b / Manual de Campo" },
        {
          grade: "severo",
          crackWidthMm: { min: 6, max: null },
          anyOfIndicators: ["caida_recubrimiento", "desconchado", "acero_expuesto"],
          sourceFigure: "Fig 17c / Manual de Campo",
        },
        {
          grade: "completo",
          anyOfIndicators: ["caida_concreto", "pandeo_barras", "fractura_barras", "desplazamiento_residual"],
          sourceFigure: "Fig 17d / Manual de Campo",
        },
      ],
    },
    mamposteria: {
      elementType: "mamposteria",
      axis: "non_structural",
      label: "Mampostería / paredes de relleno",
      grades: [
        { grade: "menor", crackWidthMm: { min: 0, max: 1 }, sourceFigure: "Tabla 3 / Manual de Campo" },
        {
          grade: "moderado",
          crackWidthMm: { min: 1, max: 10 },
          anyOfIndicators: ["grietas_diagonales", "derrumbe_parcial"],
          sourceFigure: "Tabla 3 / Manual de Campo",
        },
        {
          grade: "severo",
          anyOfIndicators: ["grietas_diagonales", "dislocacion_piezas", "derrumbe_parcial"],
          sourceFigure: "Tabla 3 / Fig 22b",
        },
        { grade: "completo", anyOfIndicators: ["derrumbe_total", "derrumbe_parcial"], sourceFigure: "Tabla 3 / Fig 22c" },
      ],
    },
    acero: {
      elementType: "acero",
      axis: "structural",
      label: "Columna / Viga / Unión (acero)",
      grades: [
        { grade: "menor", qualitative: true, sourceFigure: "Manual de Campo (deformaciones casi imperceptibles)" },
        { grade: "moderado", qualitative: true, anyOfIndicators: ["pandeo_local"], sourceFigure: "Fig 19b (pandeo incipiente)" },
        {
          grade: "severo",
          qualitative: true,
          anyOfIndicators: ["pandeo_local", "fractura_soldadura"],
          sourceFigure: "Fig 18 / Manual de Campo",
        },
        {
          grade: "completo",
          qualitative: true,
          anyOfIndicators: ["fractura_soldadura", "fractura_placa_base", "fractura_barras"],
          sourceFigure: "Fig 19a / Fig 21 / Manual de Campo",
        },
      ],
    },
  },
};

/** True if an observed crack band falls within a rubric mm range. */
export function bandInRange(band: CrackBand, range: { min: number | null; max: number | null }): boolean {
  if (band === "unknown") return false;
  const b = CRACK_BAND_MM[band];
  // The band must be entirely at or above range.min and below range.max to count.
  if (range.min !== null && b.min < range.min) return false;
  if (range.max !== null && (b.max === null || b.max > range.max)) return false;
  return true;
}
