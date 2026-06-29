// Deterministic aggregation — the national risk ladder, Boletín ANIH Nº 61.
// Pure functions. This is the compliance asset: provable, testable, identical to
// the paper instrument. ADR 0001-digital-boletin-61 §D2.
//
//  §3  Element grades -> critical-floor STRUCTURAL risk (count-driven, with the
//      severo/completo short-circuit; below it, Tabla 2 moderado-% bands).
//  §2  Five external axes, each a/b/c -> external risk (most unfavorable).
//  §5  Non-structural components, each a/b/c -> non-structural risk.
//  §6  Building risk = most unfavorable across §2/§3/§5 -> etiqueta (Tabla 5).

import type { DamageGrade, RiskLevel, Etiqueta } from "./taxonomy";
import { RISK_ORDER, ETIQUETA_FROM_RISK, RISK_FROM_LETTER } from "./taxonomy";

export type AbcLetter = "a" | "b" | "c";

/** Pick the most unfavorable (highest) risk among inputs; default bajo. */
export function mostUnfavorable(risks: RiskLevel[]): RiskLevel {
  let worst: RiskLevel = "bajo";
  for (const r of risks) {
    if (RISK_ORDER.indexOf(r) > RISK_ORDER.indexOf(worst)) worst = r;
  }
  return worst;
}

// ── §3 — Critical-floor structural risk ───────────────────────────────────────

export interface StructuralRiskResult {
  risk: RiskLevel;
  /** True if a severo/completo element short-circuited to Alto (inspection may stop). */
  shortCircuited: boolean;
  /** % of inspected elements with daño moderado (Tabla 2), when not short-circuited. */
  moderadoPct: number | null;
}

/**
 * Boletín §3 + Tabla 2.
 * @param grades grades of the inspected critical-floor structural elements
 * @param inspectedCount total elements inspected (Tabla 2 denominator). Defaults
 *        to grades.length, but may be larger when some inspected elements had no daño.
 */
export function structuralRisk(grades: DamageGrade[], inspectedCount?: number): StructuralRiskResult {
  // §3 short-circuit: any severo or completo => Riesgo C. Alto, stop.
  if (grades.some((g) => g === "severo" || g === "completo")) {
    return { risk: "alto", shortCircuited: true, moderadoPct: null };
  }
  const denom = inspectedCount ?? grades.length;
  if (denom <= 0) {
    return { risk: "bajo", shortCircuited: false, moderadoPct: 0 };
  }
  const moderados = grades.filter((g) => g === "moderado").length;
  const pct = (moderados / denom) * 100;
  // Tabla 2: <10% A · 10–30% B · >30% C.
  let risk: RiskLevel;
  if (pct > 30) risk = "alto";
  else if (pct >= 10) risk = "medio";
  else risk = "bajo";
  return { risk, shortCircuited: false, moderadoPct: pct };
}

// ── §2 / §5 — axis-letter risk ────────────────────────────────────────────────

/** External risk (§2.1): A if all a, B if any b and no c, C if any c. */
export function externalRisk(axes: AbcLetter[]): RiskLevel {
  return mostUnfavorable(axes.map((l) => RISK_FROM_LETTER[l]));
}

/** Non-structural risk (§5 / §10.1): most unfavorable component letter. */
export function nonStructuralRisk(components: AbcLetter[]): RiskLevel {
  return mostUnfavorable(components.map((l) => RISK_FROM_LETTER[l]));
}

// ── §6 — building risk + etiqueta ─────────────────────────────────────────────

export interface EtiquetaResult {
  buildingRisk: RiskLevel;
  etiqueta: Etiqueta;
}

/** Boletín §6 / Tabla 5: most unfavorable across the section risks -> etiqueta. */
export function computeEtiqueta(sectionRisks: {
  external: RiskLevel; // 5.1
  structural: RiskLevel; // 9.1
  nonStructural: RiskLevel; // 10.1
}): EtiquetaResult {
  const buildingRisk = mostUnfavorable([sectionRisks.external, sectionRisks.structural, sectionRisks.nonStructural]);
  return { buildingRisk, etiqueta: ETIQUETA_FROM_RISK[buildingRisk] };
}
