import type { ParseAmountError } from "@/domain/money/money";

/** User-facing messages for parseAmount errors. */
export const AMOUNT_ERRORS: Record<ParseAmountError, string> = {
  empty: "Enter an amount.",
  invalid: "Enter a number like 1,234.56.",
  too_many_decimals: "Too many decimal places for this currency.",
};
