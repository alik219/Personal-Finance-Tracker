import { z } from "zod";

import type { CategoryKind } from "@/domain/categories/categories";
import { positiveAmount } from "./money";

/** Expense or income: the form's toggle, which sets the amount's sign. */
export type TransactionType = CategoryKind;

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

const date = z.iso
  .date("Enter a valid date.")
  .refine(
    (d) => d >= "1900-01-01" && d <= "2999-12-31",
    "Enter a date between 1900 and 2999.",
  );

/**
 * Validates the transaction form. The account is looked up first (its
 * currency decides the decimal places), so its id is checked separately.
 */
export function parseTransaction(
  input: Record<string, string>,
  accountCurrency: string,
) {
  return z
    .object({
      type: z.enum(["expense", "income"], "Choose expense or income."),
      amount: positiveAmount(
        accountCurrency,
        "Enter an amount above zero. Use Expense or Income for the direction.",
      ),
      description: z
        .string()
        .trim()
        .min(1, "Enter a description.")
        .max(200, "Use at most 200 characters."),
      date,
      categoryId: z
        .union([z.literal(""), z.uuid("Choose a category.")])
        .transform((id) => id || null),
    })
    .transform(({ type, amount, ...rest }) => ({
      ...rest,
      amountMinor: type === "expense" ? -amount : amount,
    }))
    .safeParse(input);
}

export const isUuid = (value: string) => z.uuid().safeParse(value).success;
