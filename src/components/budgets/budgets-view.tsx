"use client";

import { Copy, PiggyBank, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { CategoryChip } from "@/components/categories/category-visuals";
import { EmptyState } from "@/components/common/empty-state";
import { MoneyText } from "@/components/common/money-text";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMonth, addMonths, type MonthKey } from "@/domain/dates/month";
import { formatMoney } from "@/domain/money/money";
import { sumByCurrency } from "@/domain/money/group";
import type { FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { copyPreviousMonth } from "@/server/actions/budgets";
import type { BudgetRow } from "@/server/budgets";

import {
  BudgetFormDialog,
  type BudgetCategoryOption,
  type EditableBudget,
} from "./budget-form-dialog";
import { BudgetProgressBar } from "./budget-progress-bar";
import { DeleteBudgetDialog } from "./delete-budget-dialog";

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; budget: EditableBudget }
  | { kind: "delete"; budget: EditableBudget }
  | null;

const toEditable = (b: BudgetRow): EditableBudget => ({
  id: b.id,
  categoryName: b.category.name,
  currency: b.currency,
  amountMinor: b.amountMinor,
});

function statusText(b: BudgetRow): string {
  if (b.status === "over") {
    return `${formatMoney(-b.remainingMinor, b.currency)} over`;
  }
  const left = `${formatMoney(b.remainingMinor, b.currency)} left`;
  return b.status === "warning" ? `${b.percent}% used · ${left}` : left;
}

export function BudgetsView({
  month,
  budgets,
  categories,
  currencies,
  defaultCurrency,
  canCopyPrevious,
}: {
  month: MonthKey;
  budgets: BudgetRow[];
  categories: BudgetCategoryOption[];
  currencies: string[];
  defaultCurrency: string;
  canCopyPrevious: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = (open: boolean) => !open && setDialog(null);
  const [copying, startCopy] = useTransition();
  const [copyResult, setCopyResult] = useState<FormState>({});

  const previousLabel = formatMonth(addMonths(month, -1));
  const taken = new Set(budgets.map((b) => `${b.categoryId}|${b.currency}`));
  const sum = (key: "amountMinor" | "spentMinor") =>
    sumByCurrency(
      budgets.map((b) => ({ currency: b.currency, amountMinor: b[key] })),
    );
  const budgeted = sum("amountMinor");
  const spent = sum("spentMinor");

  const addButton = (
    <Button onClick={() => setDialog({ kind: "create" })}>
      <Plus aria-hidden />
      Add budget
    </Button>
  );
  const copyButton = canCopyPrevious && (
    <Button
      variant="outline"
      disabled={copying}
      onClick={() =>
        startCopy(async () => setCopyResult(await copyPreviousMonth(month)))
      }
    >
      <Copy aria-hidden />
      {copying ? "Copying…" : `Copy from ${previousLabel}`}
    </Button>
  );

  return (
    <>
      <FormMessage error={copyResult.error} success={copyResult.success} />

      {budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={`No budgets for ${formatMonth(month)}`}
          description="Set a monthly limit for a category to see how your spending is going."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {addButton}
              {copyButton}
            </div>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {addButton}
            {copyButton}
          </div>

          <section
            aria-label="Totals by currency"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Object.keys(budgeted)
              .sort()
              .map((currency) => (
                <Card key={currency} size="sm" className="px-4">
                  <p className="text-sm text-muted-foreground">
                    Spent in {currency}
                  </p>
                  <p className="text-lg font-semibold">
                    <MoneyText minor={spent[currency]} currency={currency} />{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      of{" "}
                      <MoneyText
                        minor={budgeted[currency]}
                        currency={currency}
                      />
                    </span>
                  </p>
                </Card>
              ))}
          </section>

          <Card className="py-0">
            <ul aria-label="Budgets" className="divide-y">
              {budgets.map((b) => {
                const editable = toEditable(b);
                return (
                  <li key={b.id} className="grid gap-2 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CategoryChip
                        color={b.category.color}
                        icon={b.category.icon}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {b.category.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <MoneyText
                            minor={b.spentMinor}
                            currency={b.currency}
                          />{" "}
                          of{" "}
                          <MoneyText
                            minor={b.amountMinor}
                            currency={b.currency}
                          />
                        </p>
                      </div>
                      <p
                        className={cn(
                          "text-right text-sm",
                          b.status === "ok" && "text-muted-foreground",
                          b.status === "warning" &&
                            "font-medium text-amber-700 dark:text-amber-400",
                          b.status === "over" && "font-medium text-destructive",
                        )}
                      >
                        {statusText(b)}
                      </p>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${b.category.name} ${b.currency} budget`}
                          onClick={() =>
                            setDialog({ kind: "edit", budget: editable })
                          }
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${b.category.name} ${b.currency} budget`}
                          onClick={() =>
                            setDialog({ kind: "delete", budget: editable })
                          }
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </div>
                    <BudgetProgressBar
                      percent={b.percent}
                      status={b.status}
                      label={`${b.category.name} ${b.currency} budget used`}
                    />
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <BudgetFormDialog
        open={dialog?.kind === "create" || dialog?.kind === "edit"}
        onOpenChange={close}
        month={month}
        budget={dialog?.kind === "edit" ? dialog.budget : undefined}
        categories={categories}
        currencies={currencies}
        defaultCurrency={defaultCurrency}
        taken={taken}
      />
      {dialog?.kind === "delete" && (
        <DeleteBudgetDialog
          open
          onOpenChange={close}
          budget={{
            id: dialog.budget.id,
            categoryName: dialog.budget.categoryName,
            monthLabel: formatMonth(month),
          }}
        />
      )}
    </>
  );
}
