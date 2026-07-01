-- Ensure document_number (cédula) exists on engineers. It was declared in the
-- 20260628143000 volunteer-applications migration but is missing from the live
-- DB (migration-history drift). The registration form now stores the cédula
-- here and the CVI colegiado in license_number.
alter table engineers
  add column if not exists document_number text;
