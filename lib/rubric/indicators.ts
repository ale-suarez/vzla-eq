// Closed indicator vocabulary — Boletín ANIH Nº 61, Manual de Campo + Figs 11–23.
// Shared by (1) the rubric artifact, (2) the LLM's observable output, and (3) the
// deterministic grader, so the model emits the SAME tokens the rubric keys on
// (ADR 0001-digital-boletin-61 §D6). No free-text indicators anywhere.

export const STRUCTURAL_INDICATORS = [
  "caida_recubrimiento", // caída / pérdida del recubrimiento de concreto
  "desconchado", // desconchado del concreto
  "acero_expuesto", // refuerzo/barras expuestas
  "pandeo_barras", // pandeo de barras de refuerzo
  "fractura_barras", // fractura de barras
  "acortamiento_columna", // acortamiento de la columna
  "desplazamiento_residual", // desplazamiento residual / permanente
  "caida_concreto", // caída de porciones de concreto
  "aplastamiento_local", // aplastamiento local del concreto
  "grietas_diagonales", // patrón de agrietamiento diagonal
  "pandeo_local", // (acero) pandeo local en secciones
  "fractura_soldadura", // (acero) fractura de soldadura
  "fractura_placa_base", // (acero) fractura/ desgarramiento de placa base
  "dislocacion_piezas", // (mampostería) dislocación de piezas
  "derrumbe_parcial", // derrumbe parcial de la pared/elemento
  "derrumbe_total", // derrumbe total
] as const;

export type StructuralIndicator = (typeof STRUCTURAL_INDICATORS)[number];

const INDICATOR_SET = new Set<string>(STRUCTURAL_INDICATORS);

export function isStructuralIndicator(v: string): v is StructuralIndicator {
  return INDICATOR_SET.has(v);
}

/** Crack-width band the model reports (it never reports a precise mm value). */
export type CrackBand = "lt1" | "1to2" | "2to6" | "6to10" | "gt6" | "gt10" | "unknown";

/** Lower/upper bounds (mm) per band; `null` = open-ended. Used to test rubric ranges. */
export const CRACK_BAND_MM: Record<Exclude<CrackBand, "unknown">, { min: number; max: number | null }> = {
  lt1: { min: 0, max: 1 },
  "1to2": { min: 1, max: 2 },
  "2to6": { min: 2, max: 6 },
  "6to10": { min: 6, max: 10 },
  gt6: { min: 6, max: null },
  gt10: { min: 10, max: null },
};
