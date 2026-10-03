begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- Inserting into auth.users fires the sign-up trigger, which seeds defaults.
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'cat-alice@example.com'),
  ('cccccccc-0000-0000-0000-000000000002', 'cat-bob@example.com');

-- Structure ------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.categories'::regclass),
  'RLS is enabled on categories'
);

-- Default seeding --------------------------------------------------------------

select results_eq(
  $$ select kind::text, count(*)::int from public.categories
     where user_id = 'cccccccc-0000-0000-0000-000000000001'
     group by kind order by kind::text $$,
  $$ values ('expense', 13), ('income', 4) $$,
  'a new user gets 13 expense and 4 income default categories'
);

select ok(
  (select bool_and(not hidden and color <> '' and icon <> '') from public.categories
   where user_id = 'cccccccc-0000-0000-0000-000000000001'),
  'defaults are visible and have a color and icon'
);

select private.seed_default_categories('cccccccc-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.categories
   where user_id = 'cccccccc-0000-0000-0000-000000000001'),
  17,
  'seeding again does not duplicate the defaults'
);

-- Acting as Alice ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "cccccccc-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select is(
  (select count(distinct user_id)::int from public.categories),
  1,
  'a user sees only their own categories'
);

select lives_ok(
  $$ insert into public.categories (name, kind, color, icon)
     values ('Pets', 'expense', 'amber', 'paw-print') $$,
  'a user can create a category'
);

select results_eq(
  $$ select user_id::text, hidden from public.categories where name = 'Pets' $$,
  $$ values ('cccccccc-0000-0000-0000-000000000001', false) $$,
  'user_id is filled in from the session and new categories are visible'
);

select lives_ok(
  $$ insert into public.categories (name, kind) values ('Other', 'expense'),
                                                       ('Other', 'income') $$,
  'the same name can exist once per kind'
);

select results_eq(
  $$ select color, icon from public.categories where name = 'Other' and kind = 'income' $$,
  $$ values ('slate', 'tag') $$,
  'color and icon fall back to defaults'
);

select throws_ok(
  $$ insert into public.categories (name, kind) values ('pets', 'expense') $$,
  '23505', null,
  'category names are unique per user and kind, ignoring case'
);

select throws_ok(
  $$ insert into public.categories (name, kind) values (' Padded ', 'expense') $$,
  '23514', null,
  'names with surrounding spaces are rejected'
);

select throws_ok(
  $$ insert into public.categories (name, kind, color) values ('Bad', 'expense', '#ff0000') $$,
  '23514', null,
  'colors must be palette keys'
);

select throws_ok(
  $$ insert into public.categories (user_id, name, kind)
     values ('cccccccc-0000-0000-0000-000000000002', 'Sneaky', 'expense') $$,
  '42501', null,
  'a user cannot create a category for someone else'
);

update public.categories set name = 'Pet care', color = 'teal', icon = 'heart', hidden = true
  where name = 'Pets';

select results_eq(
  $$ select color, icon, hidden from public.categories where name = 'Pet care' $$,
  $$ values ('teal', 'heart', true) $$,
  'a user can rename, recolor, change the icon of and hide a category'
);

select throws_ok(
  $$ update public.categories set kind = 'income' where name = 'Pet care' $$,
  '42501', null,
  'kind cannot be changed after creation'
);

select throws_ok(
  $$ update public.categories set user_id = 'cccccccc-0000-0000-0000-000000000002'
     where name = 'Pet care' $$,
  '42501', null,
  'a category cannot be handed to another user'
);

delete from public.categories where name = 'Pet care';

select is_empty(
  $$ select 1 from public.categories where name = 'Pet care' $$,
  'a user can delete their own category'
);

-- Cross-user writes silently match nothing under RLS.
update public.categories set name = 'Hacked'
  where user_id = 'cccccccc-0000-0000-0000-000000000002';
delete from public.categories where user_id = 'cccccccc-0000-0000-0000-000000000002';

reset role;

select is(
  (select count(*)::int from public.categories
   where user_id = 'cccccccc-0000-0000-0000-000000000002' and name <> 'Hacked'),
  17,
  'another user''s categories survive cross-user update and delete attempts'
);

-- Anonymous visitors ---------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.categories $$,
  '42501', null,
  'anonymous visitors cannot read categories'
);

reset role;

-- Seeding is not callable from the API ----------------------------------------

set local role authenticated;

select throws_ok(
  $$ select private.seed_default_categories('cccccccc-0000-0000-0000-000000000002') $$,
  '42501', null,
  'users cannot call the private seeding function'
);

reset role;

-- Cascade --------------------------------------------------------------------

delete from auth.users where id = 'cccccccc-0000-0000-0000-000000000001';

select is_empty(
  $$ select 1 from public.categories where user_id = 'cccccccc-0000-0000-0000-000000000001' $$,
  'deleting a user deletes their categories'
);

select * from finish();
rollback;
