# Implementation Plan — Digital Boletín 61 (engineer-first, AI-draft)

> Spec: `docs/adr/0001-digital-boletin-61.md`. This plan breaks that ADR into ordered,
> independently-shippable tasks. Grounded against the current codebase
> (commit `master`).

## Current state (what we're flipping)

- **Flow today:** home `/form` (questionnaire) → `/upload` (typed-triad photos) →
  `/analyzing` → `/results`. **Questionnaire-first, photo-second.**
- **AI today:** `api/analysis/handlers.ts` — one contextual multi-image call
  (`gpt-4.1-mini` → `gpt-4.1` escalation) producing a per-defect verdict on the
  `low/moderate/severe/critical` scale. Persists `ai_verdict`, `confidence`, `finding`,
  `raw_ai` (blob) on `incidents`; per-photo rows in `incident_photos`.
- **Schema today:** `verdict_level` enum = `low/moderate/severe/critical`;
  `incidents` + `incident_photos` (single init migration).

## Target flow (the flip)

```
Explore/Inspect ─▶ PHOTO INPUT ─▶ AI DRAFT ─▶ PLANILLA (review + attest) ─▶
                                              deterministic etiqueta ─▶ saved inspection
```

Home "Explore" now routes to **photo input first**, then AI, then the **planilla form**
(no longer a citizen questionnaire). The citizen `/form` → `/upload` flow is **shelved**
behind hidden routes (ADR D9).

---

## Workstreams & tasks

### WS-0 — Foundations (rubric + taxonomy) · *blocks everything*

- [ ] **0.1 Rubric artifact.** Create `lib/rubric/anih-61.ts` (+ JSON) per ADR D6: per
  element-type grade definitions (`concreto_armado`, `muro_concreto`, `mamposteria`,
  `acero`, non-structural), numeric bands with explicit units, closed **indicator enum**,
  `sourceFigure`, `version: "anih-61-2023.1"`. Single source of truth.
- [ ] **0.2 National taxonomy types.** Add `DamageGrade = menor|moderado|severo|completo`
  and `RiskLevel = bajo|medio|alto` and `Etiqueta = verde|amarilla|roja` to
  `lib/assessment.ts`. Keep legacy `VerdictLevel` temporarily for migration coexistence.
- [ ] **0.3 Deterministic grader.** `lib/rubric/grade.ts`: `(elementType, observables) →
  DamageGrade`, pure function reading the artifact. Unit-tested against boletín examples
  (column >2mm+desconchado ⇒ severo, etc.). **Upward-only escalation** on indicators (D8).
- [ ] **0.4 Deterministic aggregation.** `lib/rubric/aggregate.ts`: §3 severo/completo
  short-circuit, Tabla 2 moderado-% bands, §5 component risk, §6 most-unfavorable →
  etiqueta. Pure, fully unit-tested (this is the compliance asset, ADR D2).

### WS-1 — Data model & migration

- [ ] **1.1 Enum migration.** Migrate `verdict_level` → national grade scale (decision:
  remap legacy rows vs clean-break new column). Touches `lib/assessment.ts`,
  `api/lib/schemas.ts`, `/results`, reviewer queue.
- [ ] **1.2 `inspections` table.** Per ADR D7: planilla header (§1–§4), computed risks
  (5.1/9.1/10.1), etiqueta + override + reason, `rubric_version`, geocoded address +
  lat/lng/UTM/huso, inspector ids, timestamps. RLS for engineers/admins.
- [ ] **1.3 `inspection_elements` table.** One row per element; side-by-side
  `element_type_ai/_final`, `grade_ai/_final` (grade_ai nullable), `observables_ai/_final`
  (typed columns for grade-drivers + JSONB extra), `source` enum, derived `was_overridden`
  (indexed), `confirmed`, `photo_refs`, `photo_quality`.
- [ ] **1.4 External axes.** §2 as typed columns on `inspections` (or small child table):
  per-axis `grade_ai_flag` + `grade_final`.
- [ ] **1.5 `ai_drafts` table.** One row per generation event: `raw_output` JSONB,
  `model_id`, `prompt_version`, latency, token cost. Demoted blob (replaces `raw_ai`'s
  role as the archive).
- [ ] **1.6 Supabase types regen** + reconcile generated-types drift (known pitfall).

### WS-2 — AI: photo → whole-planilla draft

- [ ] **2.1 Rework `api/analysis/handlers.ts`.** Output = **observables, not verdicts**:
  per-element `{element_type, observables[], proposed_grade}` + tipo estructural + visible
  external-axis flags. Prompt renders the rubric artifact (D6). Keep mini→strong escalation.
- [ ] **2.2 Draft assembly.** Combine model observables + deterministic grader (0.3) into a
  draft planilla object. Persist generation to `ai_drafts`; extract per-element predictions
  into `inspection_elements.*_ai` columns (D7 extraction rule).
- [ ] **2.3 No-LLM-mm / quality.** Enforce D8 (indicators escalate up only); attach
  `photo_quality` signal so the UI can mark low-confidence drafts.
- [ ] **2.4 New endpoint** `POST /api/inspections/draft` (feature folder
  `api/inspections/`), Zod-validated, returns the draft planilla for review.

### WS-3 — UI flip: photo → AI → planilla

- [ ] **3.1 Home "Explore"/Inspect entry** → route to **photo input first** (not `/form`).
  Update `components/home/home-client.tsx` links.
- [ ] **3.2 Photo capture screen.** Engineer flow: building photos + per-element photos.
  **Enforce ≥1 photo per element**, no zoom taxonomy, "quality affects draft" hint (D4).
  Reuse `/upload` components where possible; this is a *new* engineer capture, not the
  citizen triad.
- [ ] **3.3 Draft → planilla review screen.** The faithful digital planilla (§1–§14).
  AI fields render as **unconfirmed suggestions** (visually distinct); **etiqueta does not
  compute until each is confirmed/edited** (D4 anti-rubber-stamp). Inspector edits +
  attests.
- [ ] **3.4 Etiqueta panel.** Computed live by aggregation (0.4) from confirmed fields;
  inspector attest / override-with-reason.
- [ ] **3.5 Save inspection.** Write `inspections` + `inspection_elements` + axes; freeze
  `rubric_version`. Element overrides flow into `was_overridden`.
- [ ] **3.6 Croquis (§7)** + observaciones/firmas (§14) — sketch canvas + free text.

### WS-4 — Shelve citizen track (ADR D9)

- [ ] **4.1 Hide citizen routes.** Guard/hide `/form`, `/upload` (citizen variant),
  `/analyzing`, `/results` as Phase-2. Keep code in repo. Remove citizen entry points from
  home.
- [ ] **4.2 Preserve triad components** for later (note in code: do NOT relax to 1-photo).

### WS-5 — Feedback loop surfacing (lower priority)

- [ ] **5.1 Discordance query/view.** "AI vs inspector" disagreements from
  `inspection_elements.was_overridden` — eval dashboard / export.
- [ ] **5.2 Training export.** Bulk (prediction, ground-truth) rows filtered by
  `rubric_version`.

---

## Sequencing / dependencies

1. **WS-0** (rubric + grader + aggregation) — pure, testable, blocks 2 & 3.
2. **WS-1** (schema) — parallel to WS-0; gates persistence.
3. **WS-2** (AI draft) — needs WS-0.1/0.3 + WS-1.5.
4. **WS-3** (UI flip) — needs WS-0.4, WS-1, WS-2.
5. **WS-4** (shelve citizen) — can land anytime once WS-3 entry exists.
6. **WS-5** — after data is flowing.

## Open decisions to resolve before/within tasks

- **1.1** remap vs clean-break for the enum migration.
- **§8 grade scale:** planilla grid is 5-level (Sin daño + I–V); rubric is 4-level. Confirm
  the `sin_daño` sentinel handling (ADR D3 note).
- **Deck** (`docs/pitch-clasificacion-edificaciones.html`) still leads with "digitize the
  instrument" — realign to the throughput / "Cursor for structural damage" thesis.
```

