begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

-- Two users signing up, as Supabase Auth would insert them.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com',
   '{"display_name": "Alice", "timezone": "Asia/Karachi", "default_currency": "pkr"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',
   '{"full_name": "Bob Google", "timezone": "Not/AZone", "default_currency": "dollars"}');

-- Sign-up trigger ------------------------------------------------------------

select is(
  (select count(*)::int from public.profiles), 2,
  'sign-up creates one profile per user'
);

select results_eq(
  $$ select display_name, timezone, default_currency::text
     from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Alice', 'Asia/Karachi', 'PKR') $$,
  'profile takes display name, timezone and upper-cased currency from metadata'
);

select results_eq(
  $$ select display_name, timezone, default_currency::text
     from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('Bob Google', 'UTC', 'USD') $$,
  'OAuth full_name is used; invalid timezone and currency fall back to defaults'
);

insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'nometa@example.com');

select results_eq(
  $$ select display_name, timezone from public.profiles
     where id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values (null::text, 'UTC') $$,
  'sign-up without metadata still succeeds with defaults'
);

-- Structure ------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage')
    and not has_schema_privilege('authenticated', 'private', 'usage'),
  'API roles cannot reach the private helper schema'
);

-- Acting as Alice ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  $$ select id::text from public.profiles $$,
  $$ values ('11111111-1111-1111-1111-111111111111') $$,
  'a user sees only their own profile'
);

select is_empty(
  $$ select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  'a user cannot read another user''s profile by id'
);

update public.profiles set display_name = 'Hacked'
  where id = '22222222-2222-2222-2222-222222222222';

update public.profiles set display_name = 'Alice K', timezone = 'Europe/London'
  where id = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$ select display_name, timezone from public.profiles $$,
  $$ values ('Alice K', 'Europe/London') $$,
  'a user can update their own settings'
);

select throws_ok(
  $$ update public.profiles set timezone = 'Mars/Olympus'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null,
  'invalid timezone is rejected'
);

select throws_ok(
  $$ update public.profiles set default_currency = 'us'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null,
  'invalid currency code is rejected'
);

select throws_ok(
  $$ update public.profiles set id = '22222222-2222-2222-2222-222222222222'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'a user cannot change their profile id'
);

select throws_ok(
  $$ update public.profiles set created_at = now() - interval '1 year'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'a user cannot change created_at'
);

select throws_ok(
  $$ insert into public.profiles (id) values ('44444444-4444-4444-4444-444444444444') $$,
  '42501', null,
  'a user cannot insert profiles directly'
);

select throws_ok(
  $$ delete from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'a user cannot delete profiles directly'
);

-- Back to the superuser to check Bob is untouched.
reset role;

select is(
  (select display_name from public.profiles
   where id = '22222222-2222-2222-2222-222222222222'),
  'Bob Google',
  'another user''s profile is unchanged by a cross-user update'
);

-- Anonymous visitors ---------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'anonymous visitors cannot read profiles'
);

reset role;

-- Cascade --------------------------------------------------------------------

delete from auth.users where id = '22222222-2222-2222-2222-222222222222';

select is_empty(
  $$ select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  'deleting the auth user deletes their profile'
);

select is(
  (select count(*)::int from public.profiles), 2,
  'other profiles are kept'
);

select * from finish();
rollback;
