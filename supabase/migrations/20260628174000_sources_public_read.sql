-- ============================================================================
-- Public read policy on sources.
--
-- sources holds non-sensitive attribution metadata (feed name, license, credit
-- line) that MUST be displayed publicly to satisfy CC BY 4.0 for the Copernicus
-- data. Public incident responses embed it via a PostgREST join, so anon and
-- authenticated need SELECT on sources. No insert/update/delete is opened;
-- those stay server-side (admin/secret key).
-- ============================================================================

create policy "sources public read"
  on sources
  for select
  to anon, authenticated
  using (true);
