import "server-only";

import { cache } from "react";

import { budgetProgress, type BudgetProgress } from "@/domain/budgets/progress";
import type { MonthKey } from "@/domain/dates/month";
import { createClient } from "@/lib/supabase/server";
import {
  listBudgets,
  listMonthSpending,
  type BudgetWithCategory,
} from "@/server/repos/budgets";

export type BudgetRow = BudgetProgress & Pick<BudgetWithCategory, "category">;

/**
 * A month's budgets with their spending. Cached per request: the layout's
 * alert banner and the budgets page share it for the current month.
 */
export const loadBudgetProgress = cache(
  async (month: MonthKey): Promise<BudgetRow[]> => {
    const supabase = await createClient();
    const budgets = await listBudgets(supabase, month);
    if (budgets.length === 0) return [];

    const spending = await listMonthSpending(supabase, month);
    const progress = budgetProgress(budgets, spending, month);
    return progress.map((p, i) => ({ ...p, category: budgets[i].category }));
  },
);
