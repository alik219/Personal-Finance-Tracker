-- Categories: flat, per user, each either income or expense. New users get a
-- default set; they can add, rename, recolor, hide or delete any of them.
-- Follows the security pattern in *_profiles.sql.
--
-- Deleting a category is handled by the tables that reference it: later
-- migrations use "on delete set null" for transactions (they become
-- uncategorized) and "on delete cascade" for budgets.

create type public.category_kind as enum ('income', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  kind public.category_kind not null,
  -- Palette and icon keys. The app owns the lists (src/domain/categories) and
  -- falls back to a default for unknown keys, so only the format is checked.
  color text not null default 'slate' check (color ~ '^[a-z]{1,20}$'),
  icon text not null default 'tag' check (icon ~ '^[a-z0-9-]{1,40}$'),
  -- Hidden categories stay on old transactions but aren't offered for new ones.
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categories is
  'Per-user income/expense categories. Seeded with defaults on sign-up.';

-- "Other" can exist once as income and once as expense.
create unique index categories_user_kind_name_key
  on public.categories (user_id, kind, lower(name));

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

-- Grants. user_id defaults to auth.uid(); kind is fixed at creation so
-- budgets and reports keep their meaning.
revoke all on table public.categories from anon, authenticated;
grant select, delete on table public.categories to authenticated;
grant insert (name, kind, color, icon, hidden)
  on table public.categories to authenticated;
grant update (name, color, icon, hidden)
  on table public.categories to authenticated;

alter table public.categories enable row level security;

create policy "Users can view their own categories"
  on public.categories for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own categories"
  on public.categories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own categories"
  on public.categories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own categories"
  on public.categories for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Default set. Safe to call more than once: existing names are skipped.
create or replace function private.seed_default_categories(target_user uuid)
returns void
language sql
set search_path = ''
as $$
  insert into public.categories (user_id, name, kind, color, icon)
  values
    (target_user, 'Groceries',         'expense', 'green',  'shopping-cart'),
    (target_user, 'Dining out',        'expense', 'orange', 'utensils'),
    (target_user, 'Transport',         'expense', 'blue',   'car'),
    (target_user, 'Housing',           'expense', 'indigo', 'house'),
    (target_user, 'Utilities',         'expense', 'amber',  'zap'),
    (target_user, 'Shopping',          'expense', 'pink',   'shopping-bag'),
    (target_user, 'Health',            'expense', 'red',    'heart-pulse'),
    (target_user, 'Entertainment',     'expense', 'violet', 'clapperboard'),
    (target_user, 'Travel',            'expense', 'cyan',   'plane'),
    (target_user, 'Education',         'expense', 'teal',   'graduation-cap'),
    (target_user, 'Personal care',     'expense', 'lime',   'sparkles'),
    (target_user, 'Gifts & donations', 'expense', 'violet', 'gift'),
    (target_user, 'Fees & charges',    'expense', 'slate',  'receipt'),
    (target_user, 'Salary',            'income',  'green',  'briefcase'),
    (target_user, 'Freelance',         'income',  'teal',   'laptop'),
    (target_user, 'Investments',       'income',  'blue',   'trending-up'),
    (target_user, 'Other income',      'income',  'slate',  'hand-coins')
  on conflict (user_id, kind, lower(name)) do nothing;
$$;

-- Sign-up hook from *_profiles.sql, now also seeding the default categories.
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
  perform private.seed_default_categories(new.id);
  return new;
end;
$$;

-- Users who signed up before this migration get the defaults too.
select private.seed_default_categories(id) from public.profiles;
