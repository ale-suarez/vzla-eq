-- Citizen-captured human-readable address (geocoded label for the pinned
-- location). Coordinates in latitude/longitude remain the authoritative point
-- the dashboard map renders; address is a reference label only.

alter table incidents add column address text;

-- Public submissions must be able to write the address alongside the other
-- citizen-captured columns granted in 20260627180500_public_incident_submissions.
grant insert (address) on table incidents to anon, authenticated;
