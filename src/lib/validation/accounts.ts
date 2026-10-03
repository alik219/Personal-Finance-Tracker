import { z } from "zod";

import { isAccountType } from "@/domain/accounts/account-types";
import { isCurrencyCode, parseAmount } from "@/domain/money/money";

const AMOUNT_ERRORS = {
  empty: "Enter an amount.",
  invalid: "Enter a number like 1,234.56.",
  too_many_decimals: "Too many decimal places for this currency.",
} as const;

const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(60, "Use at most 60 characters.");

const type = z.string().refine(isAccountType, "Choose an account type.");

/** Opening balance text -> minor units, parsed in the account's currency. */
function openingBalance(currency: string) {
  return z.string().transform((text, ctx) => {
    if (text.trim() === "") return 0n;
    const result = parseAmount(text, currency);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: AMOUNT_ERRORS[result.error] });
      return z.NEVER;
    }
    return result.value;
  });
}

const currency = z.string().refine(isCurrencyCode, "Choose a currency.");

export function parseCreateAccount(input: Record<string, string>) {
  const base = z
    .object({ name, type, currency, openingBalance: z.string() })
    .safeParse(input);
  if (!base.success) return base;
  return z
    .object({
      name,
      type,
      currency,
      openingBalance: openingBalance(base.data.currency),
    })
    .safeParse(input);
}

/** Currency can't change after creation, so it comes from the stored account. */
export function parseUpdateAccount(
  input: Record<string, string>,
  accountCurrency: string,
) {
  return z
    .object({ name, type, openingBalance: openingBalance(accountCurrency) })
    .safeParse(input);
}
