// Feedback-loop surfacing (issue #33). Reads from inspection_elements where AI
// and inspector grades sit side by side — discordance for triage, and a bulk
// (prediction, ground-truth) export for evals/training. ADR §D7. Admin-only.

import type { Context } from "hono";

import { getSessionContext, hasAdminAccess } from "@/api/lib/auth";
import { createSupabaseAdminClient } from "@/api/lib/supabase";

const ELEMENT_FIELDS =
  "id, inspection_id, element_label, source, element_type_ai, element_type_final, " +
  "grade_ai, grade_final, crack_band_ai, crack_band_final, indicators_ai, indicators_final, " +
  "was_overridden, confirmed, photo_quality, created_at";

/**
 * GET /api/inspections/feedback/discordance
 * AI-vs-inspector disagreements, disagreements first. Recall misses
 * (inspector_added with no AI prediction) are flagged separately, not as overrides.
 */
export async function discordanceGet(c: Context) {
  const { role } = await getSessionContext();
  if (!hasAdminAccess(role)) {
    return c.json({ error: "No autorizado." }, 403);
  }

  const supabase = createSupabaseAdminClient();
  // Join the inspection's rubric_version for filtering/cohorting.
  const { data, error } = await supabase
    .from("inspection_elements")
    .select(`${ELEMENT_FIELDS}, inspections(rubric_version, etiqueta, submitted_at)`)
    .order("was_overridden", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  const rows = (data ?? []).map((r) => {
    const recallMiss = r.source === "inspector_added" && r.grade_ai === null;
    return {
      ...r,
      // A real disagreement requires an AI prediction to disagree with.
      disagreement: r.was_overridden && r.grade_ai !== null,
      recallMiss,
    };
  });

  const summary = {
    total: rows.length,
    disagreements: rows.filter((r) => r.disagreement).length,
    recallMisses: rows.filter((r) => r.recallMiss).length,
    confirmedMatches: rows.filter((r) => r.confirmed && !r.was_overridden && r.grade_ai !== null).length,
  };

  return c.json({ data: { summary, rows } });
}

/**
 * GET /api/inspections/feedback/training-export?rubric_version=anih-61-2023.1
 * Bulk (prediction, ground-truth) rows for evals/training, filtered by rubric
 * version. Only rows with both an AI prediction and a confirmed final grade.
 */
export async function trainingExportGet(c: Context) {
  const { role } = await getSessionContext();
  if (!hasAdminAccess(role)) {
    return c.json({ error: "No autorizado." }, 403);
  }

  const rubricVersion = c.req.query("rubric_version");

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("inspection_elements")
    .select(`${ELEMENT_FIELDS}, inspections!inner(rubric_version)`)
    .not("grade_ai", "is", null)
    .not("grade_final", "is", null)
    .eq("confirmed", true);

  if (rubricVersion) {
    query = query.eq("inspections.rubric_version", rubricVersion);
  }

  const { data, error } = await query.limit(5000);
  if (error) {
    return c.json({ error: error.message }, 500);
  }

  const examples = (data ?? []).map((r) => ({
    inspectionId: r.inspection_id,
    elementType: r.element_type_final ?? r.element_type_ai,
    prediction: {
      elementType: r.element_type_ai,
      grade: r.grade_ai,
      crackBand: r.crack_band_ai,
      indicators: r.indicators_ai,
    },
    groundTruth: {
      elementType: r.element_type_final,
      grade: r.grade_final,
      crackBand: r.crack_band_final,
      indicators: r.indicators_final,
    },
    agreement: !r.was_overridden,
  }));

  return c.json({ data: { count: examples.length, rubricVersion: rubricVersion ?? "all", examples } });
}
