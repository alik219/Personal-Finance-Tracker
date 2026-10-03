-- Per-user rate limit for auto-categorize, which spends the app's free
-- Gemini quota. Counted in the database so it holds across server instances.
--
-- Users get no direct access to the table: the only way in is
-- claim_ai_run(), which can't be tricked by backdating rows.

create table private.ai_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_runs_user_time_idx on private.ai_runs (user_id, created_at desc);

-- Returns true and records a run if the user is under the hourly limit.
create or replace function public.claim_ai_run()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  max_per_hour constant int := 10;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  -- Serialize claims per user so two quick clicks can't both slip in.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  -- Old rows aren't needed once they're out of the window.
  delete from private.ai_runs
    where user_id = uid and created_at < now() - interval '1 hour';

  if (select count(*) from private.ai_runs where user_id = uid) >= max_per_hour then
    return false;
  end if;

  insert into private.ai_runs (user_id) values (uid);
  return true;
end;
$$;

revoke all on function public.claim_ai_run() from public, anon;
grant execute on function public.claim_ai_run() to authenticated;
