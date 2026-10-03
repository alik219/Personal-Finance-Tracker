"use server";

import { revalidatePath } from "next/cache";

import { addMonths, formatMonth } from "@/domain/dates/month";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  parseCreateBudget,
  parseMonth,
  parseUpdateBudget,
} from "@/lib/validation/budgets";
import { fieldErrorsOf, type FormState } from "@/lib/validation/form";
import { isUuid } from "@/lib/validation/transactions";
import * as budgets from "@/server/repos/budgets";
import * as categories from "@/server/repos/categories";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

// The alert banner in the shell reads budgets too.
const refresh = () => revalidatePath("/", "layout");

export async function createBudget(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const values = {
    month: text(formData, "month"),
    categoryId: text(formData, "categoryId"),
    currency: text(formData, "currency"),
    amount: text(formData, "amount"),
  };
  const parsed = parseCreateBudget(values);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const supabase = await createClient();
  // RLS limits this to the user's own categories.
  const category = await categories.getCategory(
    supabase,
    parsed.data.categoryId,
  );
  if (!category || category.kind !== "expense") {
    return {
      fieldErrors: { categoryId: ["Choose one of your expense categories."] },
      values,
    };
  }

  const { error } = await budgets.insertBudget(supabase, parsed.data);
  if (error?.code === "23505") {
    return {
      fieldErrors: {
        categoryId: [
          `${category.name} already has a ${parsed.data.currency} budget this month.`,
        ],
      },
      values,
    };
  }
  if (error)
    return { error: "Couldn't save the budget. Please try again.", values };

  refresh();
  return { success: `Added a budget for ${category.name}.` };
}

export async function updateBudget(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const values = { amount: text(formData, "amount") };
  const supabase = await createClient();
  const id = text(formData, "id");
  const existing = isUuid(id) ? await budgets.getBudget(supabase, id) : null;
  if (!existing) return { error: "That budget no longer exists.", values };

  const parsed = parseUpdateBudget(values, existing.currency);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const { error } = await budgets.updateBudgetAmount(
    supabase,
    existing.id,
    parsed.data.amount,
  );
  if (error)
    return { error: "Couldn't save the budget. Please try again.", values };

  refresh();
  return { success: "Budget updated." };
}

export async function deleteBudget(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const id = text(formData, "id");
  const existing = isUuid(id) ? await budgets.getBudget(supabase, id) : null;
  if (!existing) return { error: "That budget no longer exists." };

  const { error } = await budgets.deleteBudget(supabase, existing.id);
  if (error) return { error: "Couldn't delete the budget. Please try again." };

  refresh();
  return { success: "Budget deleted." };
}

/** Copies last month's budgets into `month`, keeping any already set. */
export async function copyPreviousMonth(month: string): Promise<FormState> {
  await requireUser();
  const target = parseMonth(month);
  if (!target) return { error: "Choose a month." };

  const previous = addMonths(target, -1);
  const supabase = await createClient();
  try {
    const added = await budgets.copyBudgets(supabase, previous, target);
    refresh();
    return added === 0
      ? {
          success: `Every budget from ${formatMonth(previous)} is already here.`,
        }
      : {
          success: `Copied ${added} ${added === 1 ? "budget" : "budgets"} from ${formatMonth(previous)}.`,
        };
  } catch {
    return { error: "Couldn't copy the budgets. Please try again." };
  }
}
