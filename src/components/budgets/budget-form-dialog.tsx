"use client";

import { useActionState, useEffect, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { MoneyInput } from "@/components/common/money-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatMonth, type MonthKey } from "@/domain/dates/month";
import { toDecimalString } from "@/domain/money/money";
import { submitWithoutReset } from "@/lib/forms/submit-without-reset";
import type { FormState } from "@/lib/validation/form";
import { createBudget, updateBudget } from "@/server/actions/budgets";

export type BudgetCategoryOption = { id: string; name: string };

export type EditableBudget = {
  id: string;
  categoryName: string;
  currency: string;
  amountMinor: bigint;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: MonthKey;
  /** Omit to add a new budget. */
  budget?: EditableBudget;
  categories: BudgetCategoryOption[];
  currencies: string[];
  defaultCurrency: string;
  /** "categoryId|currency" pairs already budgeted this month. */
  taken: Set<string>;
};

export function BudgetFormDialog({ open, onOpenChange, ...formProps }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <BudgetForm {...formProps} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BudgetForm({
  month,
  budget,
  categories,
  currencies,
  defaultCurrency,
  taken,
  onDone,
}: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const editing = Boolean(budget);
  const [state, formAction, pending] = useActionState(
    editing ? updateBudget : createBudget,
    {} as FormState,
  );
  const v = state.values;
  const errors = state.fieldErrors;
  const [currency, setCurrency] = useState(
    v?.currency ?? budget?.currency ?? defaultCurrency,
  );
  // Categories that don't have a budget in this currency yet.
  const available = categories.filter((c) => !taken.has(`${c.id}|${currency}`));
  const [categoryId, setCategoryId] = useState(
    v?.categoryId ?? available[0]?.id ?? "",
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form onSubmit={submitWithoutReset(formAction)} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {editing ? `Edit ${budget!.categoryName} budget` : "Add budget"}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? `Change the limit for ${formatMonth(month)}.`
            : `A spending limit for one category in ${formatMonth(month)}.`}
        </DialogDescription>
      </DialogHeader>

      <FormMessage error={state.error} />
      {budget ? (
        <input type="hidden" name="id" value={budget.id} />
      ) : (
        <>
          <input type="hidden" name="month" value={month} />
          <div className="grid gap-1.5">
            <Label htmlFor="categoryId">Category</Label>
            <NativeSelect
              id="categoryId"
              name="categoryId"
              className="w-full"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {available.length === 0 && (
                <NativeSelectOption value="">
                  Every category has a {currency} budget
                </NativeSelectOption>
              )}
              {available.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {errors?.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId[0]}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="currency">Currency</Label>
            <NativeSelect
              id="currency"
              name="currency"
              className="w-full"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              Only spending from accounts in this currency counts.
            </p>
          </div>
        </>
      )}

      <MoneyInput
        name="amount"
        label="Monthly limit"
        currency={currency}
        required
        defaultValue={
          v?.amount ??
          (budget ? toDecimalString(budget.amountMinor, budget.currency) : "")
        }
        placeholder="0.00"
        errors={errors?.amount}
      />

      <DialogFooter>
        <Button
          type="submit"
          disabled={pending || (!editing && available.length === 0)}
        >
          {pending ? "Saving…" : editing ? "Save changes" : "Add budget"}
        </Button>
      </DialogFooter>
    </form>
  );
}
