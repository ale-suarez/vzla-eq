-- Volunteer engineer applications and reviewer access

create type engineer_application_status as enum ('pending', 'approved', 'rejected');

create table if not exists reviewer_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table reviewer_users is
  'Users allowed to review volunteer engineer applications.';

alter table reviewer_users enable row level security;

alter table engineers
  drop constraint if exists engineers_id_fkey;

alter table engineers
  alter column id set default gen_random_uuid();

alter table engineers
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists document_number text,
  add column if not exists specialty text,
  add column if not exists collegiate_status text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists years_experience int,
  add column if not exists organization text,
  add column if not exists linkedin_url text,
  add column if not exists motivation text,
  add column if not exists application_status engineer_application_status not null default 'pending',
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists supporting_documents jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists engineers_email_key on engineers (email);
create unique index if not exists engineers_user_id_key on engineers (user_id) where user_id is not null;

drop trigger if exists engineers_set_updated_at on engineers;
create trigger engineers_set_updated_at
  before update on engineers
  for each row
  execute function set_updated_at();

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

create or replace function public.is_reviewer_user(candidate_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reviewer_users
    where reviewer_users.user_id = candidate_id
  )
  or public.is_admin_user(candidate_id);
$$;

create or replace function public.has_review_access(candidate_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_reviewer_user(candidate_id);
$$;

create or replace function public.is_engineer_user(candidate_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.engineers e
    join auth.users u on u.id = candidate_id
    where e.is_certified = true
      and (
        e.user_id = candidate_id
        or (
          e.email is not null
          and lower(e.email) = lower(u.email)
        )
      )
  );
$$;

create or replace function public.has_backoffice_access(candidate_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin_user(candidate_id) or public.is_engineer_user(candidate_id);
$$;

drop policy if exists reviewer_users_admin_select on reviewer_users;
drop policy if exists reviewer_users_admin_write on reviewer_users;

create policy reviewer_users_admin_select
  on reviewer_users
  for select
  using (public.is_admin_user(auth.uid()));

create policy reviewer_users_admin_write
  on reviewer_users
  for all
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

drop policy if exists engineers_self_select on engineers;
drop policy if exists engineers_admin_write on engineers;

create policy engineers_self_select
  on engineers
  for select
  using (
    public.is_admin_user(auth.uid())
    or user_id = auth.uid()
    or (
      email is not null
      and exists (
        select 1
        from auth.users u
        where u.id = auth.uid()
          and lower(u.email) = lower(engineers.email)
      )
    )
  );

create policy engineers_admin_write
  on engineers
  for all
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

insert into storage.buckets (id, name, public)
values ('volunteer_application_docs', 'volunteer_application_docs', false)
on conflict (id) do nothing;
