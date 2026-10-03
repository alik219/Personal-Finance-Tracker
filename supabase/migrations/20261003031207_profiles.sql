-- Profiles: one row per auth user, created automatically on sign-up.
--
-- Security pattern for every user-owned table:
--   1. Revoke Supabase's default grants from anon/authenticated.
--   2. Grant back only the operations (and columns) the app needs.
--   3. Enable RLS with policies scoped to (select auth.uid()).

-- Helpers live in a schema the Data API doesn't expose, so they can't be
-- called as RPCs.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  timezone text not null default 'UTC'
    check (private.is_valid_timezone(timezone)),
  default_currency char(3) not null default 'USD'
    check (default_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user settings; id = auth.users.id.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Grants: read own profile, edit only the settings columns. Rows are created
-- by the sign-up trigger and deleted by cascade from auth.users.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, timezone, default_currency)
  on table public.profiles to authenticated;

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sign-up hook. Metadata comes from the client (signUp options.data) or the
-- OAuth provider, so every value is validated and falls back to a default:
-- a failure here would block the sign-up itself.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := left(nullif(btrim(coalesce(
    meta ->> 'display_name', meta ->> 'full_name', meta ->> 'name'
  )), ''), 80);
  tz text := meta ->> 'timezone';
  currency text := upper(meta ->> 'default_currency');
begin
  insert into public.profiles (id, display_name, timezone, default_currency)
  values (
    new.id,
    name,
    case when private.is_valid_timezone(tz) then tz else 'UTC' end,
    case when currency ~ '^[A-Z]{3}$' then currency else 'USD' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
