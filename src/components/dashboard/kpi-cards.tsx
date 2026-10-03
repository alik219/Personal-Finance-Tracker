import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatMoney } from "@/domain/money/money";
import type { Kpis } from "@/domain/reports/dashboard";
import { cn } from "@/lib/utils";

function Delta({
  change,
  upIsGood,
  previousLabel,
}: {
  change: number | null;
  upIsGood: boolean;
  previousLabel: string;
}) {
  if (change === null) {
    return (
      <p className="text-xs text-muted-foreground">
        Nothing to compare in {previousLabel}
      </p>
    );
  }
  const up = change > 0;
  const good = change === 0 ? null : up === upIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs",
        good === null && "text-muted-foreground",
        good === true && "text-green-700 dark:text-green-400",
        good === false && "text-destructive",
      )}
    >
      {change !== 0 && <Icon className="size-3.5" aria-hidden />}
      {change > 0 ? "+" : ""}
      {change}% vs {previousLabel}
    </p>
  );
}

function Tile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card size="sm" className="gap-1 px-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {children}
    </Card>
  );
}

/** Income, spending and net for the month, with change vs the month before. */
export function KpiCards({
  kpis,
  currency,
  previousLabel,
}: {
  kpis: Kpis;
  currency: string;
  /** e.g. "September". */
  previousLabel: string;
}) {
  return (
    <section aria-label="Month totals" className="grid gap-3 sm:grid-cols-3">
      <Tile label="Income" value={formatMoney(kpis.incomeMinor, currency)}>
        <Delta
          change={kpis.incomeChange}
          upIsGood
          previousLabel={previousLabel}
        />
      </Tile>
      <Tile label="Spending" value={formatMoney(kpis.spendingMinor, currency)}>
        <Delta
          change={kpis.spendingChange}
          upIsGood={false}
          previousLabel={previousLabel}
        />
      </Tile>
      <Tile label="Net" value={formatMoney(kpis.netMinor, currency)}>
        <p className="text-xs text-muted-foreground">Income minus spending</p>
      </Tile>
    </section>
  );
}
