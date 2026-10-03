-- Lets the app verify end-to-end connectivity (Next.js -> PostgREST -> Postgres).
create or replace function public.health_check()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;
