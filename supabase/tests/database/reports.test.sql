begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email) values
  ('efefefef-0000-0000-0000-000000000001', 'report-alice@example.com'),
  ('efefefef-0000-0000-0000-000000000002', 'report-bob@example.com');

insert into public.accounts (id, user_id, name, type, currency) values
  ('fafafafa-0000-0000-0000-000000000001', 'efefefef-0000-0000-0000-000000000001',
   'Alice USD', 'checking', 'USD'),
  ('fafafafa-0000-0000-0000-000000000002', 'efefefef-0000-0000-0000-000000000001',
   'Alice EUR', 'cash', 'EUR'),
  ('fafafafa-0000-0000-0000-000000000003', 'efefefef-0000-0000-0000-000000000002',
   'Bob USD', 'checking', 'USD');

insert into public.categories (id, user_id, name, kind) values
  ('fbfbfbfb-0000-0000-0000-000000000001', 'efefefef-0000-0000-0000-000000000001',
   'R Food', 'expense'),
  ('fbfbfbfb-0000-0000-0000-000000000002', 'efefefef-0000-0000-0000-000000000001',
   'R Rent', 'expense');

-- Fixture: September and October for Alice in two currencies, plus Bob.
insert into public.transactions
  (user_id, account_id, date, amount_minor, description, category_id, category_source)
values
  -- September, USD
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-09-01', 500000, 'Salary', null, 'none'),
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-09-30', -150000, 'Rent', 'fbfbfbfb-0000-0000-0000-000000000002', 'manual'),
  -- October, USD
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-10-01', 520000, 'Salary', null, 'none'),
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-10-02', -150000, 'Rent', 'fbfbfbfb-0000-0000-0000-000000000002', 'manual'),
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-10-10', -4500, 'Groceries', 'fbfbfbfb-0000-0000-0000-000000000001', 'manual'),
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-10-12', -2500, 'Groceries', 'fbfbfbfb-0000-0000-0000-000000000001', 'ai'),
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-10-15', -1000, 'Mystery', null, 'none'),
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-10-31', 1200, 'Refund', 'fbfbfbfb-0000-0000-0000-000000000001', 'manual'),
  -- October, EUR
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000002',
   '2026-10-20', -3000, 'Croissants', 'fbfbfbfb-0000-0000-0000-000000000001', 'manual'),
  -- November (out of range below)
  ('efefefef-0000-0000-0000-000000000001', 'fafafafa-0000-0000-0000-000000000001',
   '2026-11-01', -99999, 'Later', null, 'none'),
  -- Bob, October
  ('efefefef-0000-0000-0000-000000000002', 'fafafafa-0000-0000-0000-000000000003',
   '2026-10-05', -77777, 'Bob spend', null, 'none');

-- Acting as Alice ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "efefefef-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select results_eq(
  $$ select month::text, currency, income, spending
     from public.monthly_totals('2026-09-01', '2026-10-31') $$,
  $$ values ('2026-09-01', 'USD', 500000::bigint, 150000::bigint),
            ('2026-10-01', 'EUR', 0::bigint, 3000::bigint),
            ('2026-10-01', 'USD', 521200::bigint, 158000::bigint) $$,
  'monthly totals per month and currency, income and spending by sign'
);

select results_eq(
  $$ select month::text, currency, income, spending
     from public.monthly_totals('2026-10-01', '2026-10-31') where currency = 'USD' $$,
  $$ values ('2026-10-01', 'USD', 521200::bigint, 158000::bigint) $$,
  'a one-month range gives that month''s KPIs; later months are excluded'
);

select results_eq(
  $$ select currency, category_id::text, spending
     from public.spend_by_category('2026-10-01', '2026-10-31') $$,
  $$ values ('EUR', 'fbfbfbfb-0000-0000-0000-000000000001', 3000::bigint),
            ('USD', 'fbfbfbfb-0000-0000-0000-000000000002', 150000::bigint),
            ('USD', 'fbfbfbfb-0000-0000-0000-000000000001', 7000::bigint),
            ('USD', null, 1000::bigint) $$,
  'spending per category and currency, largest first, uncategorized as null'
);

select is(
  (select sum(spending)::bigint from public.spend_by_category('2026-10-01', '2026-10-31')
   where currency = 'USD'),
  (select spending from public.monthly_totals('2026-10-01', '2026-10-31')
   where currency = 'USD'),
  'category spending adds up to the month''s spending'
);

select is_empty(
  $$ select 1 from public.monthly_totals('2026-10-01', '2026-10-31')
     where spending = 77777 $$,
  'another user''s transactions are not included'
);

select is_empty(
  $$ select 1 from public.monthly_totals('2020-01-01', '2020-12-31') $$,
  'a range with no transactions returns no rows'
);

reset role;

-- Bob sees only his own.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "efefefef-0000-0000-0000-000000000002", "role": "authenticated"}', true);

select results_eq(
  $$ select currency, income, spending from public.monthly_totals('2026-10-01', '2026-10-31') $$,
  $$ values ('USD', 0::bigint, 77777::bigint) $$,
  'each user gets only their own totals'
);

reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.monthly_totals('2026-10-01', '2026-10-31') $$,
  '42501', null,
  'anonymous visitors cannot run reports'
);

reset role;

select * from finish();
rollback;
