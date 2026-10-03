import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Budget, BudgetTransaction } from "@/domain/budgets/progress";
import {
  colorOrDefault,
  iconOrDefault,
  type CategoryColor,
  type CategoryIcon,
} from "@/domain/categories/categories";
import { monthRange, type MonthKey } from "@/domain/dates/month";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type BudgetWithCategory = Budget & {
  category: { name: string; color: CategoryColor; icon: CategoryIcon };
};

/** Budgets are stored against the month's first day. */
const monthDate = (month: MonthKey) => `${month}-01`;

export async function listBudgets(
  supabase: Client,
  month: MonthKey,
): Promise<BudgetWithCategory[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `id, category_id, currency, amount_minor,
       category:categories!budgets_category_id_user_id_fkey (name, color, icon)`,
    )
    .eq("month", monthDate(month));
  if (error) throw error;
  return data
    .map((b) => ({
      id: b.id,
      categoryId: b.category_id,
      currency: b.currency,
      // Postgres bigint arrives as a JSON number; money is always bigint.
      amountMinor: BigInt(b.amount_minor),
      category: {
        name: b.category.name,
        color: colorOrDefault(b.category.color),
        icon: iconOrDefault(b.category.icon),
      },
    }))
    .sort(
      (a, b) =>
        a.currency.localeCompare(b.currency) ||
        a.category.name.localeCompare(b.category.name),
    );
}

export async function countBudgets(
  supabase: Client,
  month: MonthKey,
): Promise<number> {
  const { count, error } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("month", monthDate(month));
  if (error) throw error;
  return count ?? 0;
}

/** Categorized transactions in the month, with their account's currency. */
export async function listMonthSpending(
  supabase: Client,
  month: MonthKey,
): Promise<BudgetTransaction[]> {
  const { start, end } = monthRange(month);
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `date, category_id, amount_minor,
       account:accounts!transactions_account_id_user_id_fkey (currency)`,
    )
    .gte("date", start)
    .lte("date", end)
    .not("category_id", "is", null);
  if (error) throw error;
  return data.map((t) => ({
    date: t.date,
    categoryId: t.category_id,
    currency: t.account.currency,
    amountMinor: BigInt(t.amount_minor),
  }));
}

export async function getBudget(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("budgets")
    .select("id, currency")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function insertBudget(
  supabase: Client,
  input: {
    month: MonthKey;
    categoryId: string;
    currency: string;
    amount: bigint;
  },
) {
  return supabase.from("budgets").insert({
    month: monthDate(input.month),
    category_id: input.categoryId,
    currency: input.currency,
    amount_minor: Number(input.amount),
  });
}

export function updateBudgetAmount(
  supabase: Client,
  id: string,
  amount: bigint,
) {
  return supabase
    .from("budgets")
    .update({ amount_minor: Number(amount) })
    .eq("id", id);
}

export function deleteBudget(supabase: Client, id: string) {
  return supabase.from("budgets").delete().eq("id", id);
}

/**
 * Copies one month's budgets into another, skipping any the target month
 * already has. Returns how many were added.
 */
export async function copyBudgets(
  supabase: Client,
  from: MonthKey,
  to: MonthKey,
): Promise<number> {
  const { data: source, error } = await supabase
    .from("budgets")
    .select("category_id, currency, amount_minor")
    .eq("month", monthDate(from));
  if (error) throw error;
  if (source.length === 0) return 0;

  const { data: added, error: insertError } = await supabase
    .from("budgets")
    .upsert(
      source.map((b) => ({ ...b, month: monthDate(to) })),
      {
        onConflict: "user_id,category_id,currency,month",
        ignoreDuplicates: true,
      },
    )
    .select("id");
  if (insertError) throw insertError;
  return added.length;
}
