begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'acct-alice@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'acct-bob@example.com');

-- Bob's account, created as superuser.
insert into public.accounts (id, user_id, name, type, currency, opening_balance_minor)
values ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002',
        'Bob Checking', 'checking', 'USD', 50000);

-- Structure ------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.accounts'::regclass),
  'RLS is enabled on accounts'
);

select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class
   where oid = 'public.account_balances'::regclass),
  'account_balances runs with the caller''s permissions'
);

-- Acting as Alice ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.accounts (name, type, currency, opening_balance_minor)
     values ('Main Checking', 'checking', 'USD', 123450) $$,
  'a user can create an account'
);

select lives_ok(
  $$ insert into public.accounts (name, type, currency, opening_balance_minor)
     values ('Visa', 'credit_card', 'PKR', -50000) $$,
  'credit card with a negative (owed) opening balance is allowed'
);

select results_eq(
  $$ select user_id::text from public.accounts where name = 'Main Checking' $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'user_id is filled in from the session'
);

select results_eq(
  $$ select name from public.accounts order by name $$,
  $$ values ('Main Checking'), ('Visa') $$,
  'a user sees only their own accounts'
);

select results_eq(
  $$ select balance_minor from public.account_balances b
     join public.accounts a on a.id = b.account_id where a.name = 'Main Checking' $$,
  $$ values (123450::bigint) $$,
  'balance equals the opening balance while there are no transactions'
);

select is_empty(
  $$ select 1 from public.account_balances
     where account_id = 'bbbbbbbb-0000-0000-0000-000000000002' $$,
  'a user cannot see another user''s balance'
);

select throws_ok(
  $$ insert into public.accounts (user_id, name, type, currency)
     values ('aaaaaaaa-0000-0000-0000-000000000002', 'Sneaky', 'cash', 'USD') $$,
  '42501', null,
  'a user cannot create an account for someone else'
);

select throws_ok(
  $$ insert into public.accounts (name, type, currency)
     values ('main checking', 'savings', 'USD') $$,
  '23505', null,
  'account names are unique per user, ignoring case'
);

select throws_ok(
  $$ insert into public.accounts (name, type, currency) values ('', 'cash', 'USD') $$,
  '23514', null,
  'empty names are rejected'
);

select throws_ok(
  $$ insert into public.accounts (name, type, currency) values (' Padded ', 'cash', 'USD') $$,
  '23514', null,
  'names with surrounding spaces are rejected'
);

select throws_ok(
  $$ insert into public.accounts (name, type, currency) values ('Euro', 'cash', 'eur') $$,
  '23514', null,
  'lowercase currency codes are rejected'
);

update public.accounts set name = 'Everyday Checking', opening_balance_minor = 100
  where name = 'Main Checking';

select results_eq(
  $$ select opening_balance_minor from public.accounts where name = 'Everyday Checking' $$,
  $$ values (100::bigint) $$,
  'a user can rename an account and change its opening balance'
);

select throws_ok(
  $$ update public.accounts set currency = 'EUR' where name = 'Everyday Checking' $$,
  '42501', null,
  'currency cannot be changed after creation'
);

select throws_ok(
  $$ update public.accounts set user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
     where name = 'Everyday Checking' $$,
  '42501', null,
  'an account cannot be handed to another user'
);

update public.accounts set name = 'Hacked'
  where id = 'bbbbbbbb-0000-0000-0000-000000000002';
delete from public.accounts where id = 'bbbbbbbb-0000-0000-0000-000000000002';

delete from public.accounts where name = 'Visa';

select results_eq(
  $$ select name from public.accounts $$,
  $$ values ('Everyday Checking') $$,
  'a user can delete their own account'
);

reset role;

select results_eq(
  $$ select name from public.accounts where id = 'bbbbbbbb-0000-0000-0000-000000000002' $$,
  $$ values ('Bob Checking') $$,
  'another user''s account survives cross-user update and delete attempts'
);

-- Anonymous visitors ---------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.accounts $$,
  '42501', null,
  'anonymous visitors cannot read accounts'
);

reset role;

-- Cascade --------------------------------------------------------------------

delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select is_empty(
  $$ select 1 from public.accounts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'deleting a user deletes their accounts'
);

select * from finish();
rollback;
