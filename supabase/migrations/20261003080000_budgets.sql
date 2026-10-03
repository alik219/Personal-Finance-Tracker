-- Budgets: a monthly spending limit for one expense category, in one
-- currency. No rollover: each month stands alone. Spending is computed from
-- transactions when read, never stored.
-- Follows the security pattern in *_profiles.sql.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  category_id uuid not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor > 0),
  -- First day of the budget's month, e.g. 2026-10-01.
  month date not null check (extract(day from month) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Same-user category only (see *_transactions.sql); deleting the category
  -- removes its budgets.
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete cascade,
  constraint budgets_user_category_currency_month_key
    unique (user_id, category_id, currency, month)
);

comment on table public.budgets is
  'Monthly spending limit per expense category and currency.';

create index budgets_user_month_idx on public.budgets (user_id, month);
create index budgets_category_idx on public.budgets (category_id);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function private.set_updated_at();

-- Budgets only make sense for expense categories.
create or replace function private.check_budget_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select kind from public.categories where id = new.category_id) <> 'expense' then
    raise exception 'budgets need an expense category' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger budgets_check_category
  before insert on public.budgets
  for each row execute function private.check_budget_category();

-- Grants: only the amount changes after creation; to budget another
-- category or month, add a new budget.
revoke all on table public.budgets from anon, authenticated;
grant select, delete on table public.budgets to authenticated;
grant insert (category_id, currency, amount_minor, month)
  on table public.budgets to authenticated;
grant update (amount_minor) on table public.budgets to authenticated;

alter table public.budgets enable row level security;

create policy "Users can view their own budgets"
  on public.budgets for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own budgets"
  on public.budgets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete
  to authenticated
  using ((select auth.uid()) = user_id);
