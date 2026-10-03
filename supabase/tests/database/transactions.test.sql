begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, email) values
  ('dddddddd-0000-0000-0000-000000000001', 'tx-alice@example.com'),
  ('dddddddd-0000-0000-0000-000000000002', 'tx-bob@example.com');

insert into public.accounts (id, user_id, name, type, currency, opening_balance_minor) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   'Alice Checking', 'checking', 'USD', 10000),
  ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001',
   'Alice Wallet', 'cash', 'USD', 0),
  ('eeeeeeee-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000002',
   'Bob Checking', 'checking', 'USD', 0);

insert into public.categories (id, user_id, name, kind) values
  ('ffffffff-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   'Alice Snacks', 'expense'),
  ('ffffffff-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002',
   'Bob Snacks', 'expense');

insert into public.transactions (user_id, account_id, date, amount_minor, description) values
  ('dddddddd-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000003',
   '2026-01-05', -999, 'Bob secret purchase');

-- Structure ------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.transactions'::regclass),
  'RLS is enabled on transactions'
);

-- Acting as Alice ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "dddddddd-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.transactions (account_id, date, amount_minor, description)
     values ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-10', -2550, 'Coffee beans'),
            ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-15', 300000, 'Salary') $$,
  'a user can add uncategorized transactions to their account'
);

select results_eq(
  $$ select user_id::text, category_source::text from public.transactions
     where description = 'Coffee beans' $$,
  $$ values ('dddddddd-0000-0000-0000-000000000001', 'none') $$,
  'user_id comes from the session and the source defaults to none'
);

select lives_ok(
  $$ insert into public.transactions
       (account_id, date, amount_minor, description, category_id, category_source)
     values ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-11', -450, 'Chips',
             'ffffffff-0000-0000-0000-000000000001', 'manual') $$,
  'a user can add a transaction with their own category'
);

select is(
  (select count(*)::int from public.transactions),
  3,
  'a user sees only their own transactions'
);

select results_eq(
  $$ select balance_minor from public.account_balances
     where account_id = 'eeeeeeee-0000-0000-0000-000000000001' $$,
  $$ values (10000::bigint - 2550 + 300000 - 450) $$,
  'balance = opening balance + sum of transactions'
);

select results_eq(
  $$ select balance_minor from public.account_balances
     where account_id = 'eeeeeeee-0000-0000-0000-000000000002' $$,
  $$ values (0::bigint) $$,
  'an account without transactions keeps its opening balance'
);

select throws_ok(
  $$ insert into public.transactions (account_id, date, amount_minor, description)
     values ('eeeeeeee-0000-0000-0000-000000000003', '2026-01-10', -100, 'Sneaky') $$,
  '23503', null,
  'a user cannot add a transaction to another user''s account'
);

select throws_ok(
  $$ insert into public.transactions
       (account_id, date, amount_minor, description, category_id, category_source)
     values ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-10', -100, 'Sneaky',
             'ffffffff-0000-0000-0000-000000000002', 'manual') $$,
  '23503', null,
  'a user cannot use another user''s category'
);

select throws_ok(
  $$ insert into public.transactions (user_id, account_id, date, amount_minor, description)
     values ('dddddddd-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000003',
             '2026-01-10', -100, 'Sneaky') $$,
  '42501', null,
  'a user cannot create a transaction for someone else'
);

select throws_ok(
  $$ insert into public.transactions (account_id, date, amount_minor, description)
     values ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-10', 0, 'Nothing') $$,
  '23514', null,
  'zero amounts are rejected'
);

select throws_ok(
  $$ insert into public.transactions (account_id, date, amount_minor, description)
     values ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-10', -100, '') $$,
  '23514', null,
  'empty descriptions are rejected'
);

insert into public.transactions (account_id, date, amount_minor, description, category_source)
  values ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-10', -100, 'No category', 'ai');

select results_eq(
  $$ select category_source::text from public.transactions where description = 'No category' $$,
  $$ values ('none') $$,
  'a source without a category is reset to none'
);

delete from public.transactions where description = 'No category';

select throws_ok(
  $$ insert into public.transactions
       (account_id, date, amount_minor, description, category_id)
     values ('eeeeeeee-0000-0000-0000-000000000001', '2026-01-10', -100, 'Odd',
             'ffffffff-0000-0000-0000-000000000001') $$,
  '23514', null,
  'a category needs a source'
);

update public.transactions
  set account_id = 'eeeeeeee-0000-0000-0000-000000000002', amount_minor = -500
  where description = 'Chips';

select results_eq(
  $$ select account_id::text, amount_minor from public.transactions where description = 'Chips' $$,
  $$ values ('eeeeeeee-0000-0000-0000-000000000002', -500::bigint) $$,
  'a user can move a transaction to another of their accounts and edit it'
);

update public.transactions set category_id = null where description = 'Chips';

select results_eq(
  $$ select category_source::text from public.transactions where description = 'Chips' $$,
  $$ values ('none') $$,
  'clearing the category resets the source to none'
);

select throws_ok(
  $$ update public.transactions set user_id = 'dddddddd-0000-0000-0000-000000000002'
     where description = 'Chips' $$,
  '42501', null,
  'a transaction cannot be handed to another user'
);

update public.transactions
  set category_id = 'ffffffff-0000-0000-0000-000000000001', category_source = 'ai'
  where description = 'Chips';
delete from public.categories where id = 'ffffffff-0000-0000-0000-000000000001';

select results_eq(
  $$ select category_id, category_source::text from public.transactions
     where description = 'Chips' $$,
  $$ values (null::uuid, 'none') $$,
  'deleting a category leaves its transactions uncategorized'
);

-- Cross-user writes silently match nothing under RLS.
update public.transactions set description = 'Hacked'
  where user_id = 'dddddddd-0000-0000-0000-000000000002';
delete from public.transactions where user_id = 'dddddddd-0000-0000-0000-000000000002';

delete from public.transactions where description = 'Salary';

select is_empty(
  $$ select 1 from public.transactions where description = 'Salary' $$,
  'a user can delete their own transaction'
);

delete from public.accounts where id = 'eeeeeeee-0000-0000-0000-000000000002';

select is_empty(
  $$ select 1 from public.transactions where description = 'Chips' $$,
  'deleting an account deletes its transactions'
);

reset role;

select results_eq(
  $$ select description from public.transactions
     where user_id = 'dddddddd-0000-0000-0000-000000000002' $$,
  $$ values ('Bob secret purchase') $$,
  'another user''s transactions survive cross-user update and delete attempts'
);

select is_empty(
  $$ select 1 from public.account_balances b
     where b.account_id = 'eeeeeeee-0000-0000-0000-000000000003'
       and b.balance_minor <> -999 $$,
  'other users'' balances are unaffected'
);

-- Anonymous visitors ---------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.transactions $$,
  '42501', null,
  'anonymous visitors cannot read transactions'
);

reset role;

-- Cascade --------------------------------------------------------------------

delete from auth.users where id = 'dddddddd-0000-0000-0000-000000000001';

select is_empty(
  $$ select 1 from public.transactions where user_id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'deleting a user deletes their transactions'
);

select * from finish();
rollback;
