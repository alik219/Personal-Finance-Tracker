import Link from "next/link";

import { BudgetProgressBar } from "@/components/budgets/budget-progress-bar";
import { formatMoney } from "@/domain/money/money";
import { cn } from "@/lib/utils";
import type { BudgetRow } from "@/server/budgets";

/** The month's budgets in one currency, the most used first. */
export function BudgetSummary({
  budgets,
  limit = 5,
}: {
  budgets: BudgetRow[];
  limit?: number;
}) {
  if (budgets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No budgets this month.{" "}
        <Link href="/budgets" className="font-medium text-foreground underline">
          Set one
        </Link>{" "}
        to see how spending compares.
      </p>
    );
  }

  const shown = [...budgets]
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit);

  return (
    <div className="grid gap-4">
      <ul aria-label="Budgets this month" className="grid gap-4">
        {shown.map((b) => (
          <li key={b.id} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{b.category.name}</span>
              <span
                className={cn(
                  "shrink-0",
                  b.status === "ok" && "text-muted-foreground",
                  b.status === "warning" &&
                    "text-amber-700 dark:text-amber-400",
                  b.status === "over" && "text-destructive",
                )}
              >
                {formatMoney(b.spentMinor, b.currency)} of{" "}
                {formatMoney(b.amountMinor, b.currency)}
              </span>
            </div>
            <BudgetProgressBar
              percent={b.percent}
              status={b.status}
              label={`${b.category.name} budget used`}
            />
          </li>
        ))}
      </ul>
      <Link href="/budgets" className="text-sm font-medium underline">
        {budgets.length > limit
          ? `All ${budgets.length} budgets`
          : "Manage budgets"}
      </Link>
    </div>
  );
}
