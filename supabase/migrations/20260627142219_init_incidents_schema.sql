-- SafeStructure — initial persistence schema (PRD #1, Slice #2 / issue #2)
-- Creates incidents, incident_photos, engineers; shared enums; private photo
-- bucket; and a deny-all RLS baseline. Later slices open specific access tiers.

-- ============================================================================
-- Enums
-- ============================================================================

-- Shared 4-level scale used by BOTH ai_verdict (machine triage) and severity
-- (engineer judgment). Values are language-neutral; the UI maps them to display
-- labels (e.g. ES: Leve/Moderado/Grave/Severo), so the backend never needs to
-- change to support another locale.
create type verdict_level as enum ('low', 'moderate', 'severe', 'critical');

-- Incident workflow state machine: pending -> in_review -> resolved,
-- with archived as a side-branch (auto-archive no-damage / dismiss).
create type incident_state as enum ('pending', 'in_review', 'resolved', 'archived');

-- Tracks whether AI analysis completed, so an incident can exist even when
-- analysis was deferred or failed (e.g. OpenAI budget cap tripped).
create type analysis_status as enum ('pending', 'complete', 'failed');

-- ============================================================================
-- engineers (profile) — keyed to Supabase Auth users
-- ============================================================================
create table engineers (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  license_number text,
  is_certified   boolean not null default false,
  created_at     timestamptz not null default now()
);

comment on table engineers is
  'Profile for certified engineers; PK = auth.users.id. is_certified gates backoffice access.';

-- ============================================================================
-- incidents — the core record. PK doubles as the public status token.
-- ============================================================================
create table incidents (
  id              uuid primary key default gen_random_uuid(),

  -- AI machine triage (nullable: may be deferred/failed)
  ai_verdict      verdict_level,
  confidence      int check (confidence between 0 and 100),
  finding         text,
  analysis_status analysis_status not null default 'pending',
  raw_ai          jsonb,                    -- full model response, for audit

  -- Engineer human judgment (nullable until set during review)
  severity        verdict_level,

  -- Workflow
  state           incident_state not null default 'pending',
  assigned_to     uuid references engineers (id) on delete set null,
  feedback        text,                     -- engineer resolution feedback

  -- Citizen-captured context
  latitude        double precision,
  longitude       double precision,
  contact         text,                     -- optional phone, citizen-provided

  -- Engineer-entered structured building metadata
  building_use    text,                     -- building use / occupancy
  build_year      int,                      -- year of construction
  levels          int,                      -- floors above ground
  basements       int,                      -- basement levels
  material        text,                     -- structural material
  terrain_type    text,                     -- soil / terrain type

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table incidents is
  'One submitted citizen evaluation. id is the unguessable public status token.';

create index incidents_state_severity_idx on incidents (state, severity);
create index incidents_assigned_to_idx on incidents (assigned_to);
create index incidents_created_at_idx on incidents (created_at desc);

-- ============================================================================
-- incident_photos — per-photo storage path + AI result
-- ============================================================================
create table incident_photos (
  id           uuid primary key default gen_random_uuid(),
  incident_id  uuid not null references incidents (id) on delete cascade,
  storage_path text not null,               -- path within the private bucket
  position     int not null default 0,      -- display order

  -- Per-photo AI fields
  quality      text,                        -- 'usable' | 'poor' (Slice 7)
  verdict      verdict_level,
  confidence   int check (confidence between 0 and 100),
  finding      text,
  escalated    boolean not null default false,

  created_at   timestamptz not null default now()
);

create index incident_photos_incident_id_idx on incident_photos (incident_id);

-- ============================================================================
-- updated_at trigger for incidents
-- ============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger incidents_set_updated_at
  before update on incidents
  for each row
  execute function set_updated_at();

-- ============================================================================
-- RLS — deny-all baseline. No policies = no access for anon/authenticated.
-- The service-role / secret key (server-side) bypasses RLS. Later slices add:
--   #3 anon INSERT + column-whitelisted public status view,
--   #4 authenticated-engineer read/write.
-- ============================================================================
alter table engineers enable row level security;
alter table incidents enable row level security;
alter table incident_photos enable row level security;

-- ============================================================================
-- Storage — private bucket for citizen photos (no public read/write).
-- Writes happen server-side via the secret key; engineers read via
-- short-lived signed URLs.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', false)
on conflict (id) do nothing;
