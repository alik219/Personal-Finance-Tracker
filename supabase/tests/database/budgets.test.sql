begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email) values
  ('bcbcbcbc-0000-0000-0000-000000000001', 'budget-alice@example.com'),
  ('bcbcbcbc-0000-0000-0000-000000000002', 'budget-bob@example.com');

insert into public.categories (id, user_id, name, kind) values
  ('cdcdcdcd-0000-0000-0000-000000000001', 'bcbcbcbc-0000-0000-0000-000000000001',
   'Alice Food', 'expense'),
  ('cdcdcdcd-0000-0000-0000-000000000002', 'bcbcbcbc-0000-0000-0000-000000000001',
   'Alice Pay', 'income'),
  ('cdcdcdcd-0000-0000-0000-000000000003', 'bcbcbcbc-0000-0000-0000-000000000002',
   'Bob Food', 'expense');

insert into public.budgets (user_id, category_id, currency, amount_minor, month) values
  ('bcbcbcbc-0000-0000-0000-000000000002', 'cdcdcdcd-0000-0000-0000-000000000003',
   'USD', 5000, '2026-10-01');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.budgets'::regclass),
  'RLS is enabled on budgets'
);

-- Acting as Alice ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "bcbcbcbc-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.budgets (category_id, currency, amount_minor, month)
     values ('cdcdcdcd-0000-0000-0000-000000000001', 'USD', 30000, '2026-10-01') $$,
  'a user can budget one of their expense categories'
);

select lives_ok(
  $$ insert into public.budgets (category_id, currency, amount_minor, month)
     values ('cdcdcdcd-0000-0000-0000-000000000001', 'EUR', 20000, '2026-10-01'),
            ('cdcdcdcd-0000-0000-0000-000000000001', 'USD', 30000, '2026-11-01') $$,
  'the same category can have a budget per currency and per month'
);

select is(
  (select count(*)::int from public.budgets),
  3,
  'a user sees only their own budgets'
);

select throws_ok(
  $$ insert into public.budgets (category_id, currency, amount_minor, month)
     values ('cdcdcdcd-0000-0000-0000-000000000001', 'USD', 100, '2026-10-01') $$,
  '23505', null,
  'one budget per category, currency and month'
);

select throws_ok(
  $$ insert into public.budgets (category_id, currency, amount_minor, month)
     values ('cdcdcdcd-0000-0000-0000-000000000002', 'USD', 100, '2026-10-01') $$,
  '23514', 'budgets need an expense category',
  'income categories cannot be budgeted'
);

select throws_ok(
  $$ insert into public.budgets (category_id, currency, amount_minor, month)
     values ('cdcdcdcd-0000-0000-0000-000000000003', 'USD', 100, '2026-10-01') $$,
  '23503', null,
  'a user cannot budget another user''s category'
);

select throws_ok(
  $$ insert into public.budgets (category_id, currency, amount_minor, month)
     values ('cdcdcdcd-0000-0000-0000-000000000001', 'GBP', 100, '2026-10-15') $$,
  '23514', null,
  'the month must be stored as its first day'
);

select throws_ok(
  $$ insert into public.budgets (category_id, currency, amount_minor, month)
     values ('cdcdcdcd-0000-0000-0000-000000000001', 'GBP', 0, '2026-10-01') $$,
  '23514', null,
  'amounts must be positive'
);

update public.budgets set amount_minor = 35000
  where currency = 'USD' and month = '2026-10-01';

select results_eq(
  $$ select amount_minor from public.budgets where currency = 'USD' and month = '2026-10-01' $$,
  $$ values (35000::bigint) $$,
  'a user can change a budget''s amount'
);

select throws_ok(
  $$ update public.budgets set month = '2026-12-01' where currency = 'EUR' $$,
  '42501', null,
  'only the amount can change after creation'
);

-- Cross-user writes silently match nothing under RLS.
update public.budgets set amount_minor = 1
  where user_id = 'bcbcbcbc-0000-0000-0000-000000000002';
delete from public.budgets where user_id = 'bcbcbcbc-0000-0000-0000-000000000002';

delete from public.budgets where month = '2026-11-01';

select is(
  (select count(*)::int from public.budgets),
  2,
  'a user can delete their own budget'
);

reset role;

select results_eq(
  $$ select amount_minor from public.budgets
     where user_id = 'bcbcbcbc-0000-0000-0000-000000000002' $$,
  $$ values (5000::bigint) $$,
  'another user''s budget survives cross-user update and delete attempts'
);

-- Anonymous visitors ---------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.budgets $$,
  '42501', null,
  'anonymous visitors cannot read budgets'
);

reset role;

-- Cascades -------------------------------------------------------------------

delete from public.categories where id = 'cdcdcdcd-0000-0000-0000-000000000001';

select is_empty(
  $$ select 1 from public.budgets where category_id = 'cdcdcdcd-0000-0000-0000-000000000001' $$,
  'deleting a category removes its budgets'
);

delete from auth.users where id = 'bcbcbcbc-0000-0000-0000-000000000002';

select is_empty(
  $$ select 1 from public.budgets where user_id = 'bcbcbcbc-0000-0000-0000-000000000002' $$,
  'deleting a user deletes their budgets'
);

select * from finish();
rollback;
