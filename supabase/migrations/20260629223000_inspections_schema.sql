-- Digital Boletín 61 inspection schema.
-- ADR docs/adr/0001-digital-boletin-61.md §D7; issue #29.
--
-- One `inspections` row = one planilla = one building (engineer-authored).
-- `inspection_elements` is the feedback-loop spine: one row per critical-floor
-- element with side-by-side AI / engineer columns. External axes (§2) live as
-- typed columns on `inspections`. `ai_drafts` is the demoted raw-blob archive.

-- ── enums ─────────────────────────────────────────────────────────────────────

-- Risk per section / axis (A/B/C).
create type risk_level as enum ('bajo', 'medio', 'alto');
-- Building access label (§6 / §11).
create type etiqueta as enum ('verde', 'amarilla', 'roja');
-- External-axis letter as entered on the planilla (§2).
create type abc_letter as enum ('a', 'b', 'c');
-- Where an element row originated.
create type element_source as enum ('ai_drafted', 'inspector_added');
-- Element types the rubric grades (mirrors lib/rubric/artifact.ts).
create type element_type as enum ('concreto_armado', 'muro_concreto', 'mamposteria', 'acero');

-- ── inspections ─────────────────────────────────────────────────────────────

create table inspections (
  id              uuid primary key default gen_random_uuid(),
  planilla_no     text,

  -- §1 inspectors / authorship
  created_by      uuid references engineers (id) on delete set null,
  inspector_ids   uuid[] not null default '{}',

  -- §1/§2 localización + identity (geocoded address = building identity, §D5)
  address         text,
  estado          text,
  municipio       text,
  parroquia       text,
  sector          text,
  latitude        double precision,
  longitude       double precision,
  coord_utm_x     double precision,
  coord_utm_y     double precision,
  utm_huso        text,

  -- §2 datos generales / §3 uso / §4 tipo estructural
  uso             text,
  nivel_pisos     int,
  semisotanos     int,
  sotanos         int,
  anio_construccion int,
  tipo_estructural_ai    element_type,
  tipo_estructural_final element_type,

  -- §2 external axes (a/b/c). *_ai_flag = AI's verify-prompt; *_final = attested.
  ext_colapso_ai        abc_letter,
  ext_colapso_final     abc_letter,
  ext_aledanos_ai       abc_letter,
  ext_aledanos_final    abc_letter,
  ext_geologico_ai      abc_letter,
  ext_geologico_final   abc_letter,
  ext_asentamiento_final abc_letter,  -- measurement, inspector-only
  ext_inclinacion_final  abc_letter,  -- measurement, inspector-only

  -- computed section risks (§5.1 / §9.1 / §10.1) + final etiqueta (§11)
  riesgo_externo        risk_level,
  riesgo_estructura     risk_level,
  riesgo_no_estructural risk_level,
  etiqueta              etiqueta,
  etiqueta_overridden   boolean not null default false,
  override_reason       text,

  -- §7 croquis (data URL / storage ref) + §14 observaciones
  croquis_ref     text,
  observaciones   text,

  rubric_version  text not null,           -- stamped at submit (§D6)
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table inspections is
  'Digital Boletín 61 planilla. One row = one building, engineer-authored. '
  'Etiqueta is computed deterministically (lib/rubric) and attested.';

create index inspections_created_by_idx on inspections (created_by);
create index inspections_etiqueta_idx on inspections (etiqueta);
create index inspections_geo_idx on inspections (latitude, longitude);

-- ── inspection_elements (feedback-loop spine) ────────────────────────────────

create table inspection_elements (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   uuid not null references inspections (id) on delete cascade,
  element_label   text,                     -- e.g. "Columna B-3"

  source          element_source not null default 'ai_drafted',

  -- side-by-side AI / engineer (the training triple lives on ONE row)
  element_type_ai    element_type,
  element_type_final element_type,
  grade_ai        damage_grade,             -- NULLABLE: null = AI recall miss
  grade_final     damage_grade,             -- engineer attestation (authoritative)

  -- grade-driving observables as typed columns (closed enum in lib/rubric);
  -- long-tail / raw observable payload in JSONB.
  crack_band_ai    text,                     -- lt1 | 1to2 | 2to6 | 6to10 | gt6 | gt10 | unknown
  crack_band_final text,
  indicators_ai    text[] not null default '{}',
  indicators_final text[] not null default '{}',
  observables_extra jsonb,

  confirmed       boolean not null default false,
  -- derived discordance flag (generated): true when AI and final grades differ
  was_overridden  boolean generated always as (grade_ai is distinct from grade_final) stored,

  photo_refs      text[] not null default '{}',
  photo_quality   text,                      -- e.g. ok | low | unusable

  created_at      timestamptz not null default now()
);

comment on table inspection_elements is
  'One row per critical-floor element. grade_ai (prediction) + grade_final '
  '(ground truth) side by side for the feedback loop. was_overridden indexed.';

create index inspection_elements_inspection_idx on inspection_elements (inspection_id);
create index inspection_elements_overridden_idx on inspection_elements (was_overridden);

-- ── ai_drafts (demoted raw-blob archive) ──────────────────────────────────────

create table ai_drafts (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   uuid references inspections (id) on delete cascade,
  raw_output      jsonb not null,            -- full model response (replay/audit)
  model_id        text,
  prompt_version  text,
  latency_ms      int,
  token_cost      int,
  created_at      timestamptz not null default now()
);

comment on table ai_drafts is
  'One row per AI draft GENERATION event. Archive only; the feedback loop reads '
  'the extracted *_ai columns on inspection_elements, not this blob.';

create index ai_drafts_inspection_idx on ai_drafts (inspection_id);

-- ── RLS — backoffice (engineers + admins) only ───────────────────────────────

alter table inspections enable row level security;
alter table inspection_elements enable row level security;
alter table ai_drafts enable row level security;

create policy inspections_backoffice_all on inspections
  for all to authenticated
  using (public.has_backoffice_access())
  with check (public.has_backoffice_access());

create policy inspection_elements_backoffice_all on inspection_elements
  for all to authenticated
  using (public.has_backoffice_access())
  with check (public.has_backoffice_access());

create policy ai_drafts_backoffice_all on ai_drafts
  for all to authenticated
  using (public.has_backoffice_access())
  with check (public.has_backoffice_access());

-- keep updated_at fresh
create or replace function public.touch_inspection_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger inspections_touch_updated_at
  before update on inspections
  for each row execute function public.touch_inspection_updated_at();
