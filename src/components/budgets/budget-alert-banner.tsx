import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { alertMessage, budgetAlerts } from "@/domain/budgets/alerts";
import type { BudgetRow } from "@/server/budgets";

/** Shown on every page while this month's budgets need attention. */
export function BudgetAlertBanner({ budgets }: { budgets: BudgetRow[] }) {
  const { over, warning } = budgetAlerts(budgets);
  const message = alertMessage(
    over.map((b) => b.category.name),
    warning.map((b) => b.category.name),
  );
  if (!message) return null;

  return (
    <Alert
      role="status"
      aria-label="Budget alert"
      variant={over.length > 0 ? "destructive" : "default"}
    >
      <TriangleAlert aria-hidden />
      <AlertDescription className="flex flex-wrap items-center gap-x-2">
        <span>{message}</span>
        <Link href="/budgets" className="font-medium underline">
          View budgets
        </Link>
      </AlertDescription>
    </Alert>
  );
}
