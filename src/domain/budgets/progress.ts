import { monthRange, type MonthKey } from "@/domain/dates/month";

import { budgetStatus, percentUsed, type BudgetStatus } from "./alerts";

export type Budget = {
  id: string;
  categoryId: string;
  currency: string;
  amountMinor: bigint;
};

/** A transaction as budgets see it: signed amount, negative = spending. */
export type BudgetTransaction = {
  date: string;
  categoryId: string | null;
  currency: string;
  amountMinor: bigint;
};

export type BudgetProgress = Budget & {
  /** Net spending: expenses minus refunds, never below 0. */
  spentMinor: bigint;
  /** Negative when over budget. */
  remainingMinor: bigint;
  percent: number;
  status: BudgetStatus;
};

/**
 * Spending against each budget for one month. A transaction counts when its
 * category, currency and month all match: currencies are never mixed, and
 * spending in another currency doesn't touch this budget.
 */
export function budgetProgress(
  budgets: Budget[],
  transactions: BudgetTransaction[],
  month: MonthKey,
): BudgetProgress[] {
  const { start, end } = monthRange(month);
  const net = new Map<string, bigint>();
  for (const t of transactions) {
    if (t.categoryId === null || t.date < start || t.date > end) continue;
    const key = `${t.categoryId}|${t.currency}`;
    net.set(key, (net.get(key) ?? 0n) + t.amountMinor);
  }

  return budgets.map((budget) => {
    const total = net.get(`${budget.categoryId}|${budget.currency}`) ?? 0n;
    // Outflows are negative; refunds can outweigh spending, which is 0 spent.
    const spentMinor = total < 0n ? -total : 0n;
    return {
      ...budget,
      spentMinor,
      remainingMinor: budget.amountMinor - spentMinor,
      percent: percentUsed(spentMinor, budget.amountMinor),
      status: budgetStatus(spentMinor, budget.amountMinor),
    };
  });
}
