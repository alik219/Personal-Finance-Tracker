import type { BudgetStatus } from "@/domain/budgets/alerts";
import { cn } from "@/lib/utils";

const FILL: Record<BudgetStatus, string> = {
  ok: "bg-primary",
  warning: "bg-amber-500",
  over: "bg-destructive",
};

export function BudgetProgressBar({
  percent,
  status,
  label,
}: {
  percent: number;
  status: BudgetStatus;
  label: string;
}) {
  const shown = Math.min(percent, 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={shown}
      aria-valuetext={`${percent}% used`}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn("h-full rounded-full transition-all", FILL[status])}
        style={{ width: `${shown}%` }}
      />
    </div>
  );
}
