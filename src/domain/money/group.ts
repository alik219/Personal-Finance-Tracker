export type MoneyAmount = { currency: string; amountMinor: bigint };

/** Totals per currency. Currencies are never mixed or converted. */
export function sumByCurrency(
  items: Iterable<MoneyAmount>,
): Record<string, bigint> {
  const totals: Record<string, bigint> = {};
  for (const { currency, amountMinor } of items) {
    totals[currency] = (totals[currency] ?? 0n) + amountMinor;
  }
  return totals;
}
