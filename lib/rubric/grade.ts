// Deterministic grader — (elementType, observables) -> DamageGrade.
// Pure function reading the rubric artifact. No LLM, no probability.
// ADR 0001-digital-boletin-61 §D2 (deterministic adjudication), §D8 (upward-only
// escalation: indicators may raise a grade, never lower it to fabricate safety).

import type { DamageGrade, GradeOrNone } from "./taxonomy";
import { DAMAGE_GRADE_ORDER } from "./taxonomy";
import type { CrackBand, StructuralIndicator } from "./indicators";
import type { ElementType, GradeDef } from "./artifact";
import { RUBRIC, bandInRange } from "./artifact";

/** What the model perceives for one element (never a grade — facts only). */
export interface ElementObservables {
  crackBand?: CrackBand;
  indicators?: StructuralIndicator[];
}

export interface GradeResult {
  grade: GradeOrNone;
  /** The rubric grade def that matched (audit trail), or null for sin daño. */
  matched: GradeDef | null;
  /** "band" if the width band alone set it, "indicators" if escalation raised it. */
  basis: "band" | "indicators" | "none";
}

function rank(g: DamageGrade): number {
  return DAMAGE_GRADE_ORDER.indexOf(g);
}

/** Does this grade def's INDICATOR criteria match the observed indicators? */
function indicatorsMatch(def: GradeDef, observed: Set<StructuralIndicator>): boolean {
  if (def.requiredIndicators && !def.requiredIndicators.every((i) => observed.has(i))) return false;
  if (def.anyOfIndicators && def.anyOfIndicators.length > 0) {
    return def.anyOfIndicators.some((i) => observed.has(i));
  }
  // No anyOf list: required-only (or none) is enough.
  return true;
}

/**
 * Grade one element. Returns the most severe grade whose criteria are satisfied:
 *  - a grade matches by WIDTH BAND if its crackWidthMm range contains the band, OR
 *  - a grade matches by INDICATORS if its indicator criteria are met.
 * The final grade is the MAX of any band-matched grade and any indicator-matched
 * grade (upward-only escalation). Width alone never lowers an indicator-driven grade.
 */
export function gradeElement(elementType: ElementType, obs: ElementObservables): GradeResult {
  const rubric = RUBRIC.elementTypes[elementType];
  if (!rubric) {
    throw new Error(`Unknown element type: ${elementType}`);
  }
  const observed = new Set<StructuralIndicator>(obs.indicators ?? []);
  const band = obs.crackBand;

  let bandHit: { def: GradeDef; r: number } | null = null;
  let indicatorHit: { def: GradeDef; r: number } | null = null;

  for (const def of rubric.grades) {
    const r = rank(def.grade);

    // Band match: only for grades that carry a width range and we have a known band.
    if (def.crackWidthMm && band && band !== "unknown" && bandInRange(band, def.crackWidthMm)) {
      if (!bandHit || r > bandHit.r) bandHit = { def, r };
    }

    // Indicator match: grades with indicator criteria. A grade with ONLY a width
    // range (no indicator lists) is not eligible for an indicator-only hit.
    const hasIndicatorCriteria =
      (def.requiredIndicators && def.requiredIndicators.length > 0) ||
      (def.anyOfIndicators && def.anyOfIndicators.length > 0);
    if (hasIndicatorCriteria && indicatorsMatch(def, observed)) {
      if (!indicatorHit || r > indicatorHit.r) indicatorHit = { def, r };
    }
  }

  // Upward-only: take the most severe of band vs indicator matches.
  if (!bandHit && !indicatorHit) {
    // Qualitative element types (steel) with no indicators and no band => menor
    // floor if the type is purely qualitative; otherwise "sin daño" (null).
    const baseline = rubric.grades[0];
    if (baseline?.qualitative && (obs.indicators?.length ?? 0) === 0 && !band) {
      return { grade: "menor", matched: baseline, basis: "band" };
    }
    return { grade: null, matched: null, basis: "none" };
  }

  if (bandHit && (!indicatorHit || bandHit.r >= indicatorHit.r)) {
    return { grade: bandHit.def.grade, matched: bandHit.def, basis: "band" };
  }
  return { grade: indicatorHit!.def.grade, matched: indicatorHit!.def, basis: "indicators" };
}
