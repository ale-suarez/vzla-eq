-- ============================================================================
-- Make the (source_id, source_ref) uniqueness usable as an ON CONFLICT target.
--
-- The original index was PARTIAL (WHERE source_id/source_ref not null). Postgres
-- will not infer a partial unique index for `ON CONFLICT (cols)` unless the
-- predicate is restated, which the Supabase client upsert can't do. A plain
-- composite unique index works as a conflict target directly, and native rows
-- (source_ref null) still never collide because NULLs are distinct in a unique
-- index. So drop the partial index and recreate it non-partial.
-- ============================================================================

drop index if exists incidents_source_ref_uniq;

create unique index incidents_source_ref_uniq
  on incidents (source_id, source_ref);
