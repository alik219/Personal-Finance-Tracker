import { BarChart3, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { EmptyState } from "@/components/common/empty-state";
import { MonthPicker } from "@/components/common/month-picker";
import { BudgetSummary } from "@/components/dashboard/budget-summary";
import { CurrencyTabs } from "@/components/dashboard/currency-tabs";
import { DataTable } from "@/components/dashboard/data-table";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { SpendByCategoryChart } from "@/components/dashboard/spend-by-category-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addMonths,
  formatMonth,
  monthOf,
  monthRange,
  type MonthKey,
} from "@/domain/dates/month";
import { currencyDecimals, formatMoney } from "@/domain/money/money";
import {
  categoryBreakdown,
  monthKpis,
  pickCurrency,
  trend,
} from "@/domain/reports/dashboard";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseMonth } from "@/lib/validation/budgets";
import { loadBudgetProgress } from "@/server/budgets";
import { monthlyTotals, spendByCategory } from "@/server/repos/reports";
import { loadTransactionFormOptions } from "@/server/transaction-form-options";

export const metadata: Metadata = { title: "Dashboard" };

const NOTICES: Record<string, string> = {
  password_updated: "Your password has been updated.",
};

const TREND_MONTHS = 6;

/** Major units as a plain number: only for chart geometry, never for display. */
const toChartNumber = (minor: bigint, currency: string) =>
  Number(minor) / 10 ** currencyDecimals(currency);

const shortMonth = (month: MonthKey) =>
  new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
const monthName = (month: MonthKey) =>
  new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const user = await requireUser();
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  const supabase = await createClient();
  const [options, profile] = await Promise.all([
    loadTransactionFormOptions(user),
    supabase
      .from("profiles")
      .select("display_name, default_currency")
      .eq("id", user.id)
      .single(),
  ]);
  const current = monthOf(options.today);
  const month =
    (typeof params.month === "string" && parseMonth(params.month)) || current;

  const greeting = (
    <div className="grid gap-1">
      {notice && <FormMessage success={NOTICES[notice]} />}
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {profile.data?.display_name ?? user.email}
      </h1>
    </div>
  );

  if (options.accounts.length === 0) {
    return (
      <>
        {greeting}
        <EmptyState
          icon={Wallet}
          title="Start by adding an account"
          description="Add a bank account, card or cash. Then log transactions and your dashboard fills in."
          action={
            <Link href="/accounts" className={buttonVariants()}>
              Go to accounts
            </Link>
          }
        />
      </>
    );
  }

  const { end } = monthRange(month);
  const [totals, categorySpend, allBudgets] = await Promise.all([
    monthlyTotals(supabase, `${addMonths(month, -(TREND_MONTHS - 1))}-01`, end),
    spendByCategory(supabase, `${month}-01`, end),
    loadBudgetProgress(month),
  ]);

  const currencies = [
    ...new Set(options.accounts.map((a) => a.currency)),
  ].sort();
  const requested =
    typeof params.currency === "string" ? params.currency : undefined;
  const currency = pickCurrency(
    currencies,
    requested,
    totals,
    month,
    profile.data?.default_currency,
  )!;

  // Links keep the other choice: month links keep the currency and vice versa.
  const href = (m: MonthKey, c: string) => {
    const query = new URLSearchParams();
    if (m !== current) query.set("month", m);
    if (currencies.length > 1) query.set("currency", c);
    const qs = query.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  };

  const kpis = monthKpis(totals, month, currency);
  const names = new Map(options.categories.map((c) => [c.id, c.name]));
  const slices = categoryBreakdown(categorySpend, currency, names);
  const points = trend(totals, month, currency, TREND_MONTHS);
  const budgets = allBudgets.filter((b) => b.currency === currency);
  const fmt = (minor: bigint) => formatMoney(minor, currency);

  return (
    <>
      {greeting}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker
          month={month}
          current={current}
          href={(m) => href(m, currency)}
        />
        <CurrencyTabs
          currencies={currencies}
          selected={currency}
          href={(c) => href(month, c)}
        />
      </div>

      <KpiCards
        kpis={kpis}
        currency={currency}
        previousLabel={monthName(addMonths(month, -1))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Spending by category</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <section aria-label="Spending by category" className="grid gap-3">
              {slices.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title={`No spending in ${formatMonth(month)}`}
                  description="Expenses you log this month show up here by category."
                />
              ) : (
                <>
                  <SpendByCategoryChart
                    bars={slices.map((s) => ({
                      key: s.key,
                      name: s.name,
                      value: toChartNumber(s.spendingMinor, currency),
                      label: fmt(s.spendingMinor),
                    }))}
                  />
                  <DataTable
                    caption={`Spending by category, ${formatMonth(month)}`}
                    columns={["Category", "Spent"]}
                    rows={slices.map((s) => [s.name, fmt(s.spendingMinor)])}
                  />
                </>
              )}
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Budgets</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetSummary budgets={budgets} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Income and spending, last {TREND_MONTHS} months</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <section
            aria-label="Income and spending trend"
            className="grid gap-3"
          >
            <TrendChart
              currency={currency}
              rows={points.map((p) => ({
                label: shortMonth(p.month),
                title: formatMonth(p.month),
                income: toChartNumber(p.incomeMinor, currency),
                spending: toChartNumber(p.spendingMinor, currency),
                incomeLabel: fmt(p.incomeMinor),
                spendingLabel: fmt(p.spendingMinor),
              }))}
            />
            <DataTable
              caption={`Income and spending per month in ${currency}`}
              columns={["Month", "Income", "Spending"]}
              rows={points.map((p) => [
                formatMonth(p.month),
                fmt(p.incomeMinor),
                fmt(p.spendingMinor),
              ])}
            />
          </section>
        </CardContent>
      </Card>
    </>
  );
}
