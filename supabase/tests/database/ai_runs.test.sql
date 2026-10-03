begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email) values
  ('abababab-0000-0000-0000-000000000001', 'ai-alice@example.com'),
  ('abababab-0000-0000-0000-000000000002', 'ai-bob@example.com');

-- Acting as Alice ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "abababab-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select results_eq(
  $$ select bool_and(public.claim_ai_run()) from generate_series(1, 10) $$,
  $$ values (true) $$,
  'a user can auto-categorize 10 times in an hour'
);

select is(public.claim_ai_run(), false, 'the 11th run in an hour is refused');

select throws_ok(
  $$ select * from private.ai_runs $$,
  '42501', null,
  'users cannot read the runs table'
);

select throws_ok(
  $$ insert into private.ai_runs (user_id, created_at)
     values ('abababab-0000-0000-0000-000000000001', now() - interval '2 hours') $$,
  '42501', null,
  'users cannot write the runs table directly'
);

-- Bob has his own allowance.
select set_config('request.jwt.claims',
  '{"sub": "abababab-0000-0000-0000-000000000002", "role": "authenticated"}', true);

select is(public.claim_ai_run(), true, 'limits are per user');

reset role;

-- Runs older than an hour no longer count.
update private.ai_runs set created_at = now() - interval '61 minutes'
  where user_id = 'abababab-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "abababab-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select is(public.claim_ai_run(), true, 'the window slides: old runs expire');

reset role;

-- Anonymous visitors ---------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select public.claim_ai_run() $$,
  '42501', null,
  'anonymous visitors cannot claim runs'
);

reset role;

select * from finish();
rollback;
