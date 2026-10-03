-- Report functions for the dashboard. Everything is grouped by currency:
-- amounts in different currencies are never added together.
--
-- security invoker: they run with the caller's permissions, so RLS limits
-- them to the caller's own transactions. Income and spending follow the sign
-- (positive = income, negative = spending), so spend_by_category adds up to
-- monthly_totals' spending for the same range.

-- Income and spending per calendar month and currency, for months in range.
-- One function serves the KPIs (one month) and the trend (several months).
create or replace function public.monthly_totals(p_start date, p_end date)
returns table (month date, currency text, income bigint, spending bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    date_trunc('month', t.date)::date as month,
    a.currency::text,
    coalesce(sum(t.amount_minor) filter (where t.amount_minor > 0), 0)::bigint as income,
    coalesce(-sum(t.amount_minor) filter (where t.amount_minor < 0), 0)::bigint as spending
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  where t.date between p_start and p_end
  group by 1, 2
  order by 1, 2;
$$;

-- Spending (negative amounts) per category and currency in range.
-- category_id is null for uncategorized spending.
create or replace function public.spend_by_category(p_start date, p_end date)
returns table (currency text, category_id uuid, spending bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.currency::text,
    t.category_id,
    (-sum(t.amount_minor))::bigint as spending
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  where t.date between p_start and p_end
    and t.amount_minor < 0
  group by 1, 2
  order by 1, 3 desc;
$$;

revoke all on function public.monthly_totals(date, date) from public, anon;
revoke all on function public.spend_by_category(date, date) from public, anon;
grant execute on function public.monthly_totals(date, date) to authenticated;
grant execute on function public.spend_by_category(date, date) to authenticated;
