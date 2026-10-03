import type { Metadata } from "next";

import { BudgetsView } from "@/components/budgets/budgets-view";
import { MonthPicker } from "@/components/budgets/month-picker";
import { PageHeader } from "@/components/common/page-header";
import { addMonths, monthOf } from "@/domain/dates/month";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseMonth } from "@/lib/validation/budgets";
import { loadBudgetProgress } from "@/server/budgets";
import { countBudgets } from "@/server/repos/budgets";
import { loadTransactionFormOptions } from "@/server/transaction-form-options";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage({
  searchParams,
}: PageProps<"/budgets">) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const options = await loadTransactionFormOptions(user);
  const current = monthOf(options.today);
  const month =
    (typeof monthParam === "string" && parseMonth(monthParam)) || current;

  const supabase = await createClient();
  const [budgets, previousCount, profile] = await Promise.all([
    loadBudgetProgress(month),
    countBudgets(supabase, addMonths(month, -1)),
    supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", user.id)
      .single(),
  ]);

  const defaultCurrency = profile.data?.default_currency ?? "USD";
  // Currencies the user actually spends in, plus their default.
  const currencies = [
    ...new Set([defaultCurrency, ...options.accounts.map((a) => a.currency)]),
  ].sort();

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Monthly spending limits per category."
        actions={<MonthPicker month={month} current={current} />}
      />
      <BudgetsView
        // Fresh state (e.g. the copy message) per month.
        key={month}
        month={month}
        budgets={budgets}
        categories={options.categories
          .filter((c) => c.kind === "expense" && !c.hidden)
          .map(({ id, name }) => ({ id, name }))}
        currencies={currencies}
        defaultCurrency={options.accounts[0]?.currency ?? defaultCurrency}
        canCopyPrevious={previousCount > 0}
      />
    </>
  );
}
