// National damage taxonomy — Boletín ANIH Nº 61 (Oct–Dic 2023).
// This is the ONLY damage vocabulary in the digital-planilla system. It is kept
// separate from the legacy `VerdictLevel` in lib/assessment.ts on purpose
// (ADR 0001-digital-boletin-61 §D2/§D3): adjudication is deterministic and speaks
// the national scale, not the old low/moderate/severe/critical triage scale.

/** Element damage grade (Boletín §4.x / Manual de Campo). 4-level. */
export type DamageGrade = "menor" | "moderado" | "severo" | "completo";

/**
 * The §8 planilla grid additionally has a "Sin daño" column. We represent that
 * as `null` (no grade assigned) rather than a fifth grade — the rubric only ever
 * produces the four grades above. See ADR §D3.
 */
export type GradeOrNone = DamageGrade | null;

/** Risk level per axis / section (A / B / C). */
export type RiskLevel = "bajo" | "medio" | "alto";

/** Building access label (Boletín §6 / §11). */
export type Etiqueta = "verde" | "amarilla" | "roja";

/** Ordered worst-last; used by aggregation to pick the most unfavorable. */
export const DAMAGE_GRADE_ORDER: DamageGrade[] = ["menor", "moderado", "severo", "completo"];
export const RISK_ORDER: RiskLevel[] = ["bajo", "medio", "alto"];

export const DAMAGE_GRADE_LABELS: Record<DamageGrade, string> = {
  menor: "Menor",
  moderado: "Moderado",
  severo: "Severo",
  completo: "Completo",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  bajo: "A · Bajo",
  medio: "B · Medio",
  alto: "C · Alto",
};

export const ETIQUETA_LABELS: Record<Etiqueta, { title: string; access: string }> = {
  verde: { title: "Verde", access: "Acceso permitido — Edificación inspeccionada" },
  amarilla: { title: "Amarilla", access: "Acceso restringido" },
  roja: { title: "Roja", access: "Acceso no permitido — Edificación insegura" },
};

/** A → bajo, B → medio, C → alto. */
export const RISK_FROM_LETTER: Record<"a" | "b" | "c", RiskLevel> = {
  a: "bajo",
  b: "medio",
  c: "alto",
};

/** Risk → etiqueta (Boletín Tabla 5). */
export const ETIQUETA_FROM_RISK: Record<RiskLevel, Etiqueta> = {
  bajo: "verde",
  medio: "amarilla",
  alto: "roja",
};
