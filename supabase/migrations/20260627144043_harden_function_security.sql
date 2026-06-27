-- Security hardening (advisor follow-up to init_incidents_schema).
--   1. Pin set_updated_at()'s search_path (advisor: function_search_path_mutable).
--   2. Revoke public EXECUTE on the pre-existing rls_auto_enable() event-trigger
--      function so it is not callable via the REST RPC surface (advisor:
--      anon/authenticated_security_definer_function_executable). It is an event
--      trigger that no client should call directly.

-- 1. Re-define with a fixed, empty search_path.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Remove rls_auto_enable() from the client-callable API surface.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
