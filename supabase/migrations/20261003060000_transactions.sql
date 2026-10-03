-- Transactions: money in or out of one account. The sign is the kind:
-- negative = expense (outflow), positive = income. Amounts are in the
-- account's currency, which never changes. No transfers in this version.
-- Follows the security pattern in *_profiles.sql.

-- How a transaction got its category. Automation never overwrites 'manual'.
create type public.category_source as enum ('none', 'ai', 'manual');

-- Composite foreign keys below reference (id, user_id), so a transaction can
-- only point at the same user's account and category. Plain FKs would let a
-- user attach another user's ids, because FK checks bypass RLS.
alter table public.accounts
  add constraint accounts_id_user_key unique (id, user_id);
alter table public.categories
  add constraint categories_id_user_key unique (id, user_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  account_id uuid not null,
  date date not null check (date between '1900-01-01' and '2999-12-31'),
  amount_minor bigint not null check (amount_minor <> 0),
  description text not null
    check (char_length(description) between 1 and 200 and description = btrim(description)),
  -- Lowercased, card numbers and dates stripped (src/domain/text/normalize).
  -- Written by the app; used to group similar rows for AI categorization.
  normalized_description text not null default ''
    check (char_length(normalized_description) <= 200),
  category_id uuid,
  category_source public.category_source not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete cascade,
  -- Deleting a category leaves its transactions uncategorized.
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  constraint transactions_category_source_check
    check ((category_id is null) = (category_source = 'none'))
);

comment on table public.transactions is
  'Income (amount > 0) and expenses (amount < 0) per account, in minor units.';

-- Newest-first listing per user, and the filters on the transactions page.
create index transactions_user_date_idx
  on public.transactions (user_id, date desc, created_at desc, id desc);
create index transactions_account_idx on public.transactions (account_id, date desc);
create index transactions_category_idx on public.transactions (category_id, date desc);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function private.set_updated_at();

-- Clearing a category (by the user, or by the FK when the category is
-- deleted) resets its source, keeping the check constraint true.
create or replace function private.reset_category_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is null then
    new.category_source := 'none';
  end if;
  return new;
end;
$$;

create trigger transactions_reset_category_source
  before insert or update on public.transactions
  for each row execute function private.reset_category_source();

-- Grants. user_id defaults to auth.uid() and is never writable.
revoke all on table public.transactions from anon, authenticated;
grant select, delete on table public.transactions to authenticated;
grant insert (account_id, date, amount_minor, description, normalized_description,
              category_id, category_source)
  on table public.transactions to authenticated;
grant update (account_id, date, amount_minor, description, normalized_description,
              category_id, category_source)
  on table public.transactions to authenticated;

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own transactions"
  on public.transactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Balance = opening balance + every transaction in the account.
-- security_invoker makes the view obey the caller's RLS on both tables.
create or replace view public.account_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.user_id,
  a.currency,
  a.opening_balance_minor + coalesce(
    (select sum(t.amount_minor) from public.transactions t where t.account_id = a.id),
    0
  )::bigint as balance_minor
from public.accounts a;
