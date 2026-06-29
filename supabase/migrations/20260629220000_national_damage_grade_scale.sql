-- Migrate the damage scale to the national Boletín 61 taxonomy.
-- ADR docs/adr/0001-digital-boletin-61.md §D3; issue #28.
--
-- Decision (#28a): remap legacy verdict_level -> national scale system-wide, so
-- there is ONE damage vocabulary in the DB.
--   low -> menor · moderate -> moderado · severe -> severo · critical -> completo
-- Decision (#28b): the §8 planilla grid has a "Sin daño" column, so the new enum
-- is 5-level (sin_dano + the four grades), mapping 1:1 to the paper instrument.
--
-- Postgres can't drop enum values in place, so we create the new type, convert
-- every column with an explicit remap, then drop the old type.

create type damage_grade as enum ('sin_dano', 'menor', 'moderado', 'severo', 'completo');

-- Map a legacy verdict_level to the national grade. NULL stays NULL.
create or replace function legacy_verdict_to_grade(v verdict_level)
returns damage_grade
language sql immutable as $$
  select case v
    when 'low'      then 'menor'::damage_grade
    when 'moderate' then 'moderado'::damage_grade
    when 'severe'   then 'severo'::damage_grade
    when 'critical' then 'completo'::damage_grade
  end
$$;

-- incidents.ai_verdict
alter table incidents
  alter column ai_verdict drop default,
  alter column ai_verdict type damage_grade using legacy_verdict_to_grade(ai_verdict);

-- incidents.severity
alter table incidents
  alter column severity type damage_grade using legacy_verdict_to_grade(severity);

-- incident_photos.verdict
alter table incident_photos
  alter column verdict type damage_grade using legacy_verdict_to_grade(verdict);

drop function legacy_verdict_to_grade(verdict_level);
drop type verdict_level;

comment on type damage_grade is
  'National Boletín 61 element damage scale. sin_dano = §8 "Sin daño" column; '
  'menor/moderado/severo/completo per Manual de Campo. Replaces legacy verdict_level.';
