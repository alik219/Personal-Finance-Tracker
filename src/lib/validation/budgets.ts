import { z } from "zod";

import { isMonthKey } from "@/domain/dates/month";
import { isCurrencyCode } from "@/domain/money/money";

import { positiveAmount } from "./money";

const month = z.string().refine(isMonthKey, "Choose a month.");

/** New budget: the currency decides the amount's decimal places. */
export function parseCreateBudget(input: Record<string, string>) {
  const base = z
    .object({
      month,
      categoryId: z.uuid("Choose a category."),
      currency: z.string().refine(isCurrencyCode, "Choose a currency."),
      amount: z.string(),
    })
    .safeParse(input);
  if (!base.success) return base;
  return z
    .object({
      month,
      categoryId: z.uuid(),
      currency: z.string(),
      amount: positiveAmount(base.data.currency),
    })
    .safeParse(input);
}

/** Only the amount can change; the currency comes from the stored budget. */
export function parseUpdateBudget(
  input: Record<string, string>,
  currency: string,
) {
  return z.object({ amount: positiveAmount(currency) }).safeParse(input);
}

export function parseMonth(value: string): string | null {
  return month.safeParse(value).success ? value : null;
}
