import { currencyDecimals } from "@/domain/money/money";

const LIMITS = [10, 100, 1_000, 10_000];

/**
 * A rough size instead of the exact amount, e.g. "10–100 USD". Enough for a
 * model to tell a coffee from rent without sharing the real figure.
 */
export function amountRange(amountMinor: bigint, currency: string): string {
  const abs = amountMinor < 0n ? -amountMinor : amountMinor;
  const major = Number(abs) / 10 ** currencyDecimals(currency);
  const upper = LIMITS.findIndex((limit) => major < limit);
  if (upper === 0) return `under 10 ${currency}`;
  if (upper === -1) return `over 10,000 ${currency}`;
  const fmt = (n: number) => n.toLocaleString("en-US");
  return `${fmt(LIMITS[upper - 1])}–${fmt(LIMITS[upper])} ${currency}`;
}
