-- RBAC layer for anonymous citizens, certified engineers, and admins.
-- Anonymous users never get direct DB access to backoffice tables.
-- Engineers are certified by the `engineers` profile row.
-- Admins are tracked separately because they may not be engineers.

-- ============================================================================
-- Admin users
-- ============================================================================
create table if not exists admin_users (
  id         uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table admin_users is
  'Users allowed to administer all backoffice data.';

alter table admin_users enable row level security;

-- ============================================================================
-- Role helpers
-- ============================================================================
create or replace function public.is_admin_user(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where id = user_id
  );
$$;

create or replace function public.is_engineer_user(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.engineers
    where id = user_id
      and is_certified = true
  );
$$;

create or replace function public.has_backoffice_access(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin_user(user_id) or public.is_engineer_user(user_id);
$$;

-- ============================================================================
-- Policies: admin_users
-- ============================================================================
drop policy if exists admin_users_admin_select on admin_users;
drop policy if exists admin_users_admin_write on admin_users;

create policy admin_users_admin_select
  on admin_users
  for select
  using (public.is_admin_user(auth.uid()));

create policy admin_users_admin_write
  on admin_users
  for all
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

-- ============================================================================
-- Policies: engineers
-- ============================================================================
drop policy if exists engineers_self_select on engineers;
drop policy if exists engineers_admin_write on engineers;

create policy engineers_self_select
  on engineers
  for select
  using (auth.uid() = id or public.is_admin_user(auth.uid()));

create policy engineers_admin_write
  on engineers
  for all
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

-- ============================================================================
-- Policies: incidents
-- ============================================================================
drop policy if exists incidents_backoffice_select on incidents;
drop policy if exists incidents_backoffice_insert on incidents;
drop policy if exists incidents_backoffice_update on incidents;
drop policy if exists incidents_backoffice_delete on incidents;

create policy incidents_backoffice_select
  on incidents
  for select
  using (public.has_backoffice_access(auth.uid()));

create policy incidents_backoffice_insert
  on incidents
  for insert
  with check (public.has_backoffice_access(auth.uid()));

create policy incidents_backoffice_update
  on incidents
  for update
  using (public.has_backoffice_access(auth.uid()))
  with check (public.has_backoffice_access(auth.uid()));

create policy incidents_backoffice_delete
  on incidents
  for delete
  using (public.is_admin_user(auth.uid()));

-- ============================================================================
-- Policies: incident_photos
-- ============================================================================
drop policy if exists incident_photos_backoffice_select on incident_photos;
drop policy if exists incident_photos_backoffice_write on incident_photos;

create policy incident_photos_backoffice_select
  on incident_photos
  for select
  using (public.has_backoffice_access(auth.uid()));

create policy incident_photos_backoffice_write
  on incident_photos
  for all
  using (public.has_backoffice_access(auth.uid()))
  with check (public.has_backoffice_access(auth.uid()));
