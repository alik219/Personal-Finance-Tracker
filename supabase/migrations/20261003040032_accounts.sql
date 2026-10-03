-- Accounts: where money lives (checking, credit card, cash...). Each has one
-- currency for life; balances are never converted between currencies.
-- Follows the security pattern in *_profiles.sql.

create type public.account_type as enum (
  'checking', 'savings', 'credit_card', 'cash', 'investment', 'loan', 'other'
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60 and name = btrim(name)),
  type public.account_type not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  -- Minor units (cents). Negative for money owed, e.g. a credit card balance.
  opening_balance_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accounts is
  'User accounts. Deleting one cascades to its transactions (confirmed in the UI).';

create unique index accounts_user_name_key on public.accounts (user_id, lower(name));

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function private.set_updated_at();

-- Grants. user_id is never writable: it defaults to auth.uid() on insert.
-- currency is fixed at creation so existing amounts keep their meaning.
revoke all on table public.accounts from anon, authenticated;
grant select, delete on table public.accounts to authenticated;
grant insert (name, type, currency, opening_balance_minor)
  on table public.accounts to authenticated;
grant update (name, type, opening_balance_minor)
  on table public.accounts to authenticated;

alter table public.accounts enable row level security;

create policy "Users can view their own accounts"
  on public.accounts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own accounts"
  on public.accounts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own accounts"
  on public.accounts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own accounts"
  on public.accounts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Current balance per account. For now that is the opening balance;
-- backlog task 14 redefines it to add the sum of the account's transactions.
-- security_invoker makes the view obey the caller's RLS on accounts.
create view public.account_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.user_id,
  a.currency,
  a.opening_balance_minor as balance_minor
from public.accounts a;

revoke all on table public.account_balances from anon, authenticated;
grant select on table public.account_balances to authenticated;
