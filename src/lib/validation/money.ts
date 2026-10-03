import { z } from "zod";

import { parseAmount, type ParseAmountError } from "@/domain/money/money";

/** User-facing messages for parseAmount errors. */
export const AMOUNT_ERRORS: Record<ParseAmountError, string> = {
  empty: "Enter an amount.",
  invalid: "Enter a number like 1,234.56.",
  too_many_decimals: "Too many decimal places for this currency.",
};

/** Amount text -> positive minor units in `currency`. */
export function positiveAmount(
  currency: string,
  notPositive = "Enter an amount above zero.",
) {
  return z.string().transform((text, ctx) => {
    const result = parseAmount(text, currency);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: AMOUNT_ERRORS[result.error] });
      return z.NEVER;
    }
    if (result.value <= 0n) {
      ctx.addIssue({ code: "custom", message: notPositive });
      return z.NEVER;
    }
    return result.value;
  });
}
