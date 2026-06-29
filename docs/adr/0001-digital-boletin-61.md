# ADR 0001 — Digital Boletín 61: engineer-first inspection instrument with AI draft

> Status: **accepted**
> Date: 2026-06-29
> Supersedes `docs/ai-analysis-flow.md` (the earlier defect-triad design).
> Source of truth for the rubric: **Boletín ANIH Nº 61, Oct–Dic 2023** —
> *"Evaluación Rápida de Daños en Edificaciones"* (López, Coronel, Ginés, Fierro, Marinilli,
> Urich · FUNVISIS / Ministerio del Poder Popular para Relaciones Interiores, Justicia y Paz).
> Patent reference for future CV measurement: SOM **US20200279364A1**.

---

## Context

We are building software around the national rapid post-event building evaluation (Boletín
61). Two facts drive every decision:

1. **The boletín is a deterministic decision table.** The Manual de Campo consolidates the
   element figures (Figs 11–23) into four rubric rows; §6 takes the **most unfavorable risk**
   across the external axes (§2), structural damage (§3/§4) and non-structural (§5) to place
   one **etiqueta** (Verde / Amarilla / Roja). There is no statistical model in the verdict.
2. **The binding constraint is throughput.** ~50 certified inspectors against ~20,000
   buildings (~400 each) after a disaster. The bottleneck is not whether an inspector can
   tick a box correctly — it is *authoring 400 full planillas by hand* in the days an
   emergency allows.

Partner feedback (Universidad Metropolitana) set the near-term scope: **engineer-facing
only**, positioned to become the **official government instrument**.

---

## Product thesis

**"Cursor for structural damage."** A faithful digital Boletín 61 planilla where the
inspector photographs a building, the **AI pre-fills a whole-planilla draft**, and the
inspector **reviews, corrects, and attests**. The deterministic engine computes the etiqueta
from the confirmed fields. The human stays author of record; the AI is the throughput
multiplier that makes 400 buildings/inspector physically possible.

```
  photos ──▶ AI draft (perception) ──▶ inspector reviews/corrects/attests ──▶
        deterministic engine (rubric tables) ──▶ etiqueta ──▶ twin node
```

---

## Decisions

### D1 — The product is the faithful digital planilla; AI drafts, code computes, engineer attests

The product *is* the Boletín 61 instrument, digitized field-for-field (so an authority can
adopt it). The certified inspector is the **author of record**; every field is human-attested.
On top of the paper form we add exactly two things:

- **AI proposes** (drafts) fields from photos — perception only.
- **Code computes** the risk roll-up and etiqueta deterministically.

### D2 — The etiqueta is a deterministic algorithm, never a model (compliance asset)

**All adjudication is deterministic code** driven by the rubric artifact (D6): every a/b/c
lookup, the §3 severo/completo short-circuit, the Tabla 2 moderado-% bands, §5 component
risk, and §6 most-unfavorable → etiqueta. **No LLM in adjudication.** This is what makes it
provable, testable, identical to paper, and adoptable by government. The LLM's only job is
perception (photo → observables the table looks up); it is off the adjudication path.

### D3 — National taxonomy (the only vocabulary in the system)

- **Element damage grade:** `menor` / `moderado` / `severo` / `completo`.
  (The §8 planilla grid also has a "Sin daño" column → store grade as nullable / a `sin_daño`
  sentinel; the rubric's grade-driving bands are the four above.)
- **Risk per axis / section:** `bajo` / `medio` / `alto` (A / B / C).
- **Building output (etiqueta):** `verde` (inspeccionada) / `amarilla` (restringido) /
  `roja` (insegura).

This replaces the legacy `low/moderate/severe/critical` enum in `lib/assessment.ts` and the
ad-hoc `/form` questionnaire as the data model. Migration mechanics (remap vs clean-break)
are tracked separately.

### D4 — Photo → whole-planilla draft, with an anti-rubber-stamp suggestion model

The inspector photographs the building; the AI pre-fills the **whole planilla** — tipo
estructural (§4), critical-floor element grades (§3/§4/§8), and the **visible** external
axes (§2: collapse, adjacent rubble, ground cracking). Tilt and settlement stay
**verify-only** measurements the inspector enters.

**Suggestion semantics (like Cursor):** AI fields arrive as **unconfirmed suggestions**,
visually distinct. The etiqueta **does not compute until every suggested field is confirmed
or edited**. A suggestion is not "in the planilla" until accepted. Overrides become training
data (D7).

**Capture rule — draft-grade, not diagnostic-grade.** Because the inspector verifies each
element *in person*, photos only need to be good enough to **draft a category**:

- **Enforce 1 photo per critical-floor element.** The AI drafts element type + proposed grade.
- **No mandatory zoom/framing taxonomy.** _Note: photo quality determines draft quality_ —
  a clear close shot yields a confident grade; a poor one yields type-only / low-confidence,
  which the present inspector corrects.
- A weak photo only weakens the *proposal*; nothing is a final grade until the inspector
  attests. **No fabricated finals.**

Photo ceiling is **path-driven, ~10 typical**: a §3 severo/completo finding short-circuits to
Riesgo C and inspection may stop (few photos for the worst buildings); moderate buildings may
need more *lightweight* shots for the Tabla 2 element count.

### D5 — Building identity = inspector-entered geocoded address

The inspector is a trusted certified author at the building. The **geocoded address +
coordinates they enter is the building identity.** One planilla = one building. No crowd-era
dedup/clustering. Store coordinates as **structured numeric geodata** (lat/long or PostGIS
point) — every completed planilla is a node in the eventual digital twin.

### D6 — Rubric artifact: single source of truth, versioned, traceable

Extract the Boletín 61 thresholds into a **structured, versioned rubric artifact** in the
repo (`rubric.ts` / JSON), consumed by **all three** consumers: the LLM draft prompt, the
deterministic grader, and the aggregation logic. Shape — **per element type** (the boletín is
heterogeneous: different indicators, different crack-width numbers, different scales per type):

```jsonc
{
  "version": "anih-61-2023.1",
  "source": "Boletín ANIH Nº 61, Oct–Dic 2023 (Manual de Campo)",
  "elementTypes": {
    "concreto_armado": {            // columna, viga, losa, techo, unión
      "axis": "structural",
      "grades": [
        { "grade": "menor",    "crackWidth": { "max": 1, "unit": "mm" } },
        { "grade": "moderado", "crackWidth": { "min": 1, "max": 2, "unit": "mm" } },
        { "grade": "severo",   "crackWidth": { "min": 2, "unit": "mm" },
          "requiredIndicators": ["caida_recubrimiento"], "sourceFigure": "Fig 11c / Manual de Campo" },
        { "grade": "completo", "anyOfIndicators": ["pandeo_de_barras","fractura_barras","desplazamiento_residual"] }
      ]
    },
    "muro_concreto":   { "axis": "structural", "grades": [ /* <2mm / 2–6mm / >6mm + … */ ] },
    "mamposteria":     { "axis": "non_structural", "grades": [ /* <1mm / 1–10mm + diagonales / derrumbe */ ] },
    "acero":           { "axis": "structural", "grades": [ /* deformación imperceptible / pandeo incipiente / pandeo local·fractura */ ] }
    // relleno / non-structural §5 components share the non_structural axis
  }
}
```

- **Indicator vocabulary is a closed enum**, shared by the rubric, the LLM's observable
  output, and the grader (no free-text mismatch).
- **Units explicit per numeric** (`mm` crack width, `cm` settlement, `ratio` tilt).
- **`sourceFigure`** per grade = audit trail / defense to an authority.
- **Versioned** — the boletín defers fire/corrosion to a future revision; historical data
  records which rubric version graded it.
- All element-type / boundary logic stays **server-side**.

### D7 — Feedback loop & data model

The reconciliation that trains a future model lives at the **element** level, on the national
grade. Both the AI draft and the inspector's attestation persist; the **inspector's grade is
authoritative** (UI reads `grade_final ?? grade_ai`); evals/training read both.

**One row per element — AI and engineer are parallel columns, not separate rows.** (The
training triple is a *comparison*; both operands belong side by side so evals are a `SELECT`,
not a self-join.)

```
inspections                         -- one row per planilla = one building
  id, planilla_no, inspector_ids, address, lat, lng, coord_utm, huso,
  datos_generales..., uso, tipo_estructural_ai, tipo_estructural_final,
  riesgo_externo (5.1), riesgo_estructura (9.1), riesgo_no_estructural (10.1),
  etiqueta (§11), etiqueta_overridden, override_reason,
  rubric_version,                   -- stamped at submit; every join filters on it
  created_at, submitted_at

inspection_elements                 -- one row per critical-floor element (spine of the loop)
  id, inspection_id (FK), element_label,
  source            -- enum: 'ai_drafted' | 'inspector_added'
  element_type_ai,  element_type_final,
  grade_ai,         grade_final,     -- national scale; grade_ai NULLABLE (recall misses)
  observables_ai,   observables_final,
  was_overridden,   -- derived: grade_ai IS DISTINCT FROM grade_final (indexed)
  confirmed, photo_refs, photo_quality

inspection_external_axes            -- §2; 5 typed fields (fixed, few): per axis grade_ai_flag + grade_final
                                    -- (modeled as columns on `inspections` or a small child table)

ai_drafts                           -- demoted raw blob: ONE row per draft GENERATION event
  id, inspection_id (FK), raw_output (JSONB), model_id, prompt_version,
  latency_ms, token_cost, created_at
```

Rules:

- **`ai_drafts` = the raw blob, kept but demoted** — full model output, append-only, for
  replay/audit/debugging. **Not** what the loop queries.
- On draft generation, per-element predictions are **extracted from the blob into the
  structured `*_ai` columns** of `inspection_elements`. Blob = archive; columns = working set.
- **Re-draft:** overwrite the `*_ai` columns (latest draft wins); the full history stays in
  `ai_drafts`.
- **Recall misses:** inspector-added elements the AI never proposed have `grade_ai = NULL`
  and `source = 'inspector_added'` — distinguishable from disagreements, not counted as
  predictions.
- **Observable storage:** grade-driving indicators (closed enum from D6) as **typed
  columns** for first-class eval queries; a JSONB `extra` for the long tail.
- The schema **mirrors the boletín §1–§14**, so an authority comparing the DB to the paper
  form finds a 1:1 mapping.

### D8 — Crack width: human reference, not LLM millimeter-guessing

The LLM **never guesses millimeters**. It reports **indicators** (band, desconchado, exposed
rebar, buckling, pattern) and may **escalate a grade upward** on indicator evidence
(desconchado ⇒ severo even if width is unclear), **never downward** to fabricate safety. A
future CV measurement pipeline (SOM patent: segment crack pixels + reference object,
`minAreaRect`) can drop in behind the same band field without touching the rubric or
aggregation.

### D9 — The citizen track is shelved, not removed (Phase 2)

The citizen path designed earlier (a friendly-but-strict `/form` questionnaire, `/upload`,
lay coin-reference, escalate-only **never-Verde** provisional flag, and the **full element
triad** because there the photo *is* the conclusion) is **preserved in the repo behind
hidden/guarded routes**. It is the Phase-2 funnel and the engine of the digital twin at
scale. **Do not relax the citizen triad to the engineer 1-photo rule** — the relaxed capture
(D4) is engineer-draft-only, valid only because an expert verifies in person.

---

## Consequences

- The product is immediately **demonstrable as the official instrument**: it *is* the
  planilla, faithful, plus AI draft and auto-computed etiquetas — adoptable by government
  because no black box places etiquetas.
- The hardest crowd-era problems (dedup, lay-vocabulary translation, never-Verde safety
  dance) **disappear for now** — a certified inspector authors everything.
- The feedback loop is a first-class relational table (`inspection_elements`), not blob
  parsing — every reviewed element is a (prediction, ground-truth) training row.
- Implementation order: (1) faithful planilla data model + UI, (2) rubric artifact +
  deterministic grader + etiqueta computation, (3) AI whole-planilla draft on photos,
  (4) feedback-loop extraction into `inspection_elements`, (5) re-surface citizen track later.
```

