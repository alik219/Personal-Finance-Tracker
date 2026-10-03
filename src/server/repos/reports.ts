import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ISODate } from "@/domain/dates/month";
import type { CategorySpend, MonthlyTotal } from "@/domain/reports/dashboard";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/** monthly_totals(): income and spending per month and currency. */
export async function monthlyTotals(
  supabase: Client,
  start: ISODate,
  end: ISODate,
): Promise<MonthlyTotal[]> {
  const { data, error } = await supabase.rpc("monthly_totals", {
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return data.map((r) => ({
    month: r.month.slice(0, 7),
    currency: r.currency,
    // Postgres bigint arrives as a JSON number; money is always bigint.
    incomeMinor: BigInt(r.income),
    spendingMinor: BigInt(r.spending),
  }));
}

/** spend_by_category(): spending per category and currency. */
export async function spendByCategory(
  supabase: Client,
  start: ISODate,
  end: ISODate,
): Promise<CategorySpend[]> {
  const { data, error } = await supabase.rpc("spend_by_category", {
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return data.map((r) => ({
    currency: r.currency,
    categoryId: r.category_id,
    spendingMinor: BigInt(r.spending),
  }));
}
