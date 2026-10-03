import { formatMoney } from "@/domain/money/money";
import { cn } from "@/lib/utils";

/** A formatted amount in tabular figures, e.g. "$1,234.50" or "-$12.30". */
export function MoneyText({
  minor,
  currency,
  className,
}: {
  minor: bigint;
  currency: string;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatMoney(minor, currency)}
    </span>
  );
}
