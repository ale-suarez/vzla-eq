-- ============================================================================
-- Typed photo evidence on incident_photos (see docs/ai-analysis-flow.md).
--
-- A submission now documents ONE defect via a required triad (general /
-- intermedia / acercamiento) plus optional supplementary photos. Persist which
-- view each stored photo represents so the reviewer queue can label shots and
-- show why one was rejected. The full analysis blob still lives in
-- incidents.raw_ai; these columns are the cheap, queryable summary.
-- ============================================================================

-- Photo tier: part of the required triad, or optional supplementary evidence.
create type photo_tier as enum ('triad', 'supplementary');

alter table incident_photos
  add column tier photo_tier,
  -- Free text rather than an enum: triad views (general/intermedia/acercamiento)
  -- and supplementary types (exterior/columna/puerta-ventana/otro) share this
  -- column, and the vocabulary may grow without a schema change.
  add column view_type text;

comment on column incident_photos.tier is
  'triad = one of the three required defect views; supplementary = optional extra evidence';
comment on column incident_photos.view_type is
  'Photo type: general|intermedia|acercamiento (triad) or exterior|columna|puerta-ventana|otro (supplementary)';
