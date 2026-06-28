-- Engineer volunteers capture a pinned location with the same LocationPicker the
-- citizen incident form uses, so we can later match engineers to nearby
-- incidents. Mirror the incidents table: plain latitude/longitude columns plus a
-- geocoded address label. The previous free-text city/country fields are dropped
-- in favour of the authoritative coordinates.

alter table engineers
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists address text;

alter table engineers
  drop column if exists city,
  drop column if exists country;
