-- Managed engineer invite links. An admin creates a named source (e.g. "UNIMET");
-- each gets a unique token used in /join/<token>. Engineers register through the
-- link and their application records which source they came from. Approval is
-- unchanged — the link only attributes the source.

create table engineer_invite_sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  token       text not null unique,
  created_by  uuid references auth.users (id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table engineer_invite_sources is
  'Named invite links for engineer onboarding. token -> /join/<token>; counts via engineers.invite_source_id.';

-- Which invite source an engineer application came through (null = un-attributed).
alter table engineers
  add column if not exists invite_source_id uuid references engineer_invite_sources (id) on delete set null;

create index engineers_invite_source_idx on engineers (invite_source_id);

-- RLS: locked down. API handlers use the service-role client (like the rest of
-- the app); these policies are defense-in-depth (admins only via direct access).
alter table engineer_invite_sources enable row level security;

create policy engineer_invite_sources_admin_all on engineer_invite_sources
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
