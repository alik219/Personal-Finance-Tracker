export type BudgetStatus = "ok" | "warning" | "over";

/** Share of the budget that triggers a warning, in percent. */
export const WARNING_PERCENT = 80n;

/**
 * ok under 80%, warning from 80% up to the full budget, over once spending
 * goes past it. Exact bigint math: no rounding at the edges.
 */
export function budgetStatus(
  spentMinor: bigint,
  budgetMinor: bigint,
): BudgetStatus {
  if (spentMinor > budgetMinor) return "over";
  if (spentMinor * 100n >= budgetMinor * WARNING_PERCENT) return "warning";
  return "ok";
}

/** Whole percent used, rounded down, never below 0 (may exceed 100). */
export function percentUsed(spentMinor: bigint, budgetMinor: bigint): number {
  if (spentMinor <= 0n) return 0;
  return Number((spentMinor * 100n) / budgetMinor);
}

/** Budgets that need the user's attention, worst first. */
export function budgetAlerts<T extends { status: BudgetStatus }>(
  budgets: T[],
): { over: T[]; warning: T[] } {
  return {
    over: budgets.filter((b) => b.status === "over"),
    warning: budgets.filter((b) => b.status === "warning"),
  };
}

/** "A and B", "A, B and C". */
function joinNames(names: string[]): string {
  return names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The alert banner's sentence, or null when nothing needs attention. */
export function alertMessage(over: string[], warning: string[]): string | null {
  const unique = (names: string[]) => [...new Set(names)];
  const parts: string[] = [];
  const o = unique(over);
  const w = unique(warning).filter((name) => !o.includes(name));
  if (o.length > 0) {
    parts.push(`${joinNames(o)} ${o.length === 1 ? "is" : "are"} over budget.`);
  }
  if (w.length > 0) {
    parts.push(
      `${joinNames(w)} ${w.length === 1 ? "is" : "are"} close to the limit.`,
    );
  }
  return parts.length > 0 ? parts.join(" ") : null;
}
