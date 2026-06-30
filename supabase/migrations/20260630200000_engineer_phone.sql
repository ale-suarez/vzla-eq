-- Add a phone column to engineers for the profile screen. Other profile fields
-- (full_name, email, license_number, specialty, document_number, city) already
-- exist from earlier migrations.
alter table engineers
  add column if not exists phone text;
