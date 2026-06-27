-- Allow anonymous incident submissions from the public assessment flow.
-- The app server still owns validation, but RLS keeps direct DB access scoped.

-- Grant insert on the public submission columns only.
grant insert (
  id,
  ai_verdict,
  confidence,
  finding,
  analysis_status,
  raw_ai,
  severity,
  state,
  latitude,
  longitude,
  contact,
  building_use,
  build_year,
  levels,
  basements,
  material,
  terrain_type
) on table incidents to anon, authenticated;

-- Public submissions may only create unassigned pending incidents.
drop policy if exists incidents_public_insert on incidents;

create policy incidents_public_insert
  on incidents
  for insert
  to anon, authenticated
  with check (
    not public.has_backoffice_access(auth.uid())
    and state = 'pending'
    and assigned_to is null
    and feedback is null
  );
