import { addMonths, type MonthKey } from "@/domain/dates/month";

/** One row of monthly_totals(): a month's income and spending in a currency. */
export type MonthlyTotal = {
  month: MonthKey;
  currency: string;
  incomeMinor: bigint;
  spendingMinor: bigint;
};

/** One row of spend_by_category(); categoryId null = uncategorized. */
export type CategorySpend = {
  currency: string;
  categoryId: string | null;
  spendingMinor: bigint;
};

export type Kpis = {
  incomeMinor: bigint;
  spendingMinor: bigint;
  netMinor: bigint;
  /** Change vs the previous month in whole percent; null when there's no base. */
  incomeChange: number | null;
  spendingChange: number | null;
};

const ZERO = { incomeMinor: 0n, spendingMinor: 0n };

function totalFor(totals: MonthlyTotal[], month: MonthKey, currency: string) {
  return (
    totals.find((t) => t.month === month && t.currency === currency) ?? ZERO
  );
}

/** Whole-percent change, rounded toward zero; null when last month was 0. */
export function percentChange(
  current: bigint,
  previous: bigint,
): number | null {
  if (previous === 0n) return null;
  return Number(((current - previous) * 100n) / previous);
}

export function monthKpis(
  totals: MonthlyTotal[],
  month: MonthKey,
  currency: string,
): Kpis {
  const now = totalFor(totals, month, currency);
  const before = totalFor(totals, addMonths(month, -1), currency);
  return {
    incomeMinor: now.incomeMinor,
    spendingMinor: now.spendingMinor,
    netMinor: now.incomeMinor - now.spendingMinor,
    incomeChange: percentChange(now.incomeMinor, before.incomeMinor),
    spendingChange: percentChange(now.spendingMinor, before.spendingMinor),
  };
}

export type TrendPoint = {
  month: MonthKey;
  incomeMinor: bigint;
  spendingMinor: bigint;
};

/** The `months` months ending at `month`, oldest first, gaps filled with 0. */
export function trend(
  totals: MonthlyTotal[],
  month: MonthKey,
  currency: string,
  months = 6,
): TrendPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const m = addMonths(month, i - months + 1);
    const t = totalFor(totals, m, currency);
    return {
      month: m,
      incomeMinor: t.incomeMinor,
      spendingMinor: t.spendingMinor,
    };
  });
}

export type CategorySlice = {
  /** Category id, "uncategorized" or "other". */
  key: string;
  name: string;
  spendingMinor: bigint;
};

/**
 * Spending per category for one currency, largest first. Past `limit` bars
 * the tail folds into "Other" so the chart stays readable.
 */
export function categoryBreakdown(
  rows: CategorySpend[],
  currency: string,
  names: Map<string, string>,
  limit = 7,
): CategorySlice[] {
  const slices = rows
    .filter((r) => r.currency === currency && r.spendingMinor > 0n)
    .map((r) => ({
      key: r.categoryId ?? "uncategorized",
      name:
        r.categoryId === null
          ? "Uncategorized"
          : (names.get(r.categoryId) ?? "Deleted category"),
      spendingMinor: r.spendingMinor,
    }))
    .sort((a, b) =>
      a.spendingMinor === b.spendingMinor
        ? a.name.localeCompare(b.name)
        : a.spendingMinor > b.spendingMinor
          ? -1
          : 1,
    );

  if (slices.length <= limit) return slices;
  const head = slices.slice(0, limit - 1);
  const rest = slices.slice(limit - 1);
  return [
    ...head,
    {
      key: "other",
      name: `Other (${rest.length})`,
      spendingMinor: rest.reduce((sum, s) => sum + s.spendingMinor, 0n),
    },
  ];
}

/**
 * The currency to show: the requested one if the user has it, else the one
 * with the most spending this month, else their default currency, else the
 * first.
 */
export function pickCurrency(
  available: string[],
  requested: string | undefined,
  totals: MonthlyTotal[],
  month: MonthKey,
  defaultCurrency?: string,
): string | undefined {
  if (requested && available.includes(requested)) return requested;
  const busiest = totals
    .filter((t) => t.month === month && available.includes(t.currency))
    .sort((a, b) =>
      a.spendingMinor === b.spendingMinor
        ? 0
        : a.spendingMinor > b.spendingMinor
          ? -1
          : 1,
    )[0];
  if (busiest) return busiest.currency;
  if (defaultCurrency && available.includes(defaultCurrency)) {
    return defaultCurrency;
  }
  return available[0];
}
