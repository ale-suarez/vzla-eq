-- ============================================================================
-- Data provenance (aggregator foundation).
--
-- incidents now aggregates building-damage records from multiple upstreams
-- (native citizen submissions, partner feeds like SismoAyuda VE, and open
-- datasets like Copernicus EMS), not just first-party reports.
--
-- Feed-level metadata (display name, license, attribution URL) is shared across
-- every row from that feed, so it lives once in `sources` rather than being
-- duplicated per incident. Each incident carries only what is genuinely
-- per-row: which source it came from (FK), the upstream id within that source,
-- and when it was last synced.
--
-- (source_id, source_ref) is the idempotency key: a sync upserts on conflict so
-- re-runs refresh existing rows instead of duplicating.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- sources — one row per upstream feed. uuid PK (consistent with incidents /
-- engineers); `code` is the stable, constrained handle that ingest code matches
-- on, so we never hardcode a uuid and a reworded display name can't break a
-- sync. `name` is presentation; `code` is the machine identifier.
-- ----------------------------------------------------------------------------
create table sources (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,          -- code handle, e.g. 'copernicus-emsr884'
  name        text not null,                 -- display name for UI credits
  license     text,                          -- e.g. 'CC-BY-4.0'
  url         text,                          -- attribution / origin link
  attribution text,                          -- exact credit line to render
  created_at  timestamptz not null default now()
);

comment on table sources is
  'Upstream data feeds aggregated into incidents. Feed-level metadata (license, attribution) lives here, once per feed; code is the stable machine handle.';

-- Seed the feeds we already aggregate. CC BY 4.0 requires the attribution line
-- to be shown wherever Copernicus data is displayed publicly.
insert into sources (code, name, license, url, attribution) values
  ('citizen', 'Reportes ciudadanos', null, null, null),
  ('synthetic', 'Datos sintéticos (desarrollo)', null, null, null),
  ('copernicus-emsr884',
   'Copernicus EMS — EMSR884 La Guaira',
   'CC-BY-4.0',
   'https://emergency.copernicus.eu/mapping/list-of-components/EMSR884',
   '© Copernicus Emergency Management Service (EMSR884), CC BY 4.0');

-- ----------------------------------------------------------------------------
-- incidents — provenance link. Nullable so the existing native rows (which
-- predate this) need no backfill; new ingests always set it.
-- ----------------------------------------------------------------------------
alter table incidents
  add column source_id  uuid references sources (id) on delete set null,
  add column source_ref text,                -- upstream record id within source
  add column synced_at  timestamptz;         -- last pull from source

comment on column incidents.source_id is
  'FK to sources; which feed this row came from. Null for legacy/native rows.';
comment on column incidents.source_ref is
  'Upstream record id within source; (source_id, source_ref) is the sync idempotency key.';
comment on column incidents.synced_at is
  'Timestamp this row was last pulled from its source.';

-- Idempotent per-source upserts: the same upstream record can't land twice.
-- source_ref is only unique WITHIN a feed, so the constraint is composite.
-- Partial: native rows (no source_ref) are exempt.
create unique index incidents_source_ref_uniq
  on incidents (source_id, source_ref)
  where source_id is not null and source_ref is not null;

-- ----------------------------------------------------------------------------
-- RLS — sources is non-sensitive attribution metadata, but keep the deny-all
-- baseline consistent with the other tables; reads happen server-side via the
-- secret key, and a later slice can add a public read policy for UI credits.
-- ----------------------------------------------------------------------------
alter table sources enable row level security;
