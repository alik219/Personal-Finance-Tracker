"use client";

import { useActionState, useEffect, useState } from "react";

import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { MoneyInput } from "@/components/common/money-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type {
  CategoryColor,
  CategoryIcon,
  CategoryKind,
} from "@/domain/categories/categories";
import { toDecimalString } from "@/domain/money/money";
import type { CategorySource } from "@/domain/transactions/category-source";
import { submitWithoutReset } from "@/lib/forms/submit-without-reset";
import type { FormState } from "@/lib/validation/form";
import {
  TRANSACTION_TYPES,
  type TransactionType,
} from "@/lib/validation/transactions";
import { cn } from "@/lib/utils";
import {
  createTransaction,
  updateTransaction,
} from "@/server/actions/transactions";

/** What the form needs to offer choices; loaded once by the server. */
export type TransactionFormOptions = {
  accounts: { id: string; name: string; currency: string }[];
  categories: {
    id: string;
    name: string;
    kind: CategoryKind;
    color: CategoryColor;
    icon: CategoryIcon;
    hidden: boolean;
  }[];
  /** Today in the user's time zone, as YYYY-MM-DD. */
  today: string;
};

export type EditableTransaction = {
  id: string;
  date: string;
  amountMinor: bigint;
  description: string;
  accountId: string;
  currency: string;
  categoryId: string | null;
  categorySource: CategorySource;
};

export function TransactionForm({
  options,
  transaction,
  onDone,
  footer,
}: {
  options: TransactionFormOptions;
  /** Omit to add a new transaction. */
  transaction?: EditableTransaction;
  onDone: () => void;
  /** Extra controls next to the submit button (e.g. delete). */
  footer?: React.ReactNode;
}) {
  const editing = Boolean(transaction);
  const [state, formAction, pending] = useActionState(
    editing ? updateTransaction : createTransaction,
    {} as FormState,
  );
  const v = state.values;
  const errors = state.fieldErrors;

  const [type, setType] = useState<TransactionType>(
    v?.type === "income" || v?.type === "expense"
      ? v.type
      : transaction && transaction.amountMinor > 0n
        ? "income"
        : "expense",
  );
  const [accountId, setAccountId] = useState(
    v?.accountId ?? transaction?.accountId ?? options.accounts[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    v?.categoryId ?? transaction?.categoryId ?? "",
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  const currency =
    options.accounts.find((a) => a.id === accountId)?.currency ??
    transaction?.currency ??
    "";

  // Hidden categories aren't offered, except the one already on this row.
  const categories = options.categories.filter(
    (c) => c.kind === type && (!c.hidden || c.id === transaction?.categoryId),
  );

  function changeType(next: TransactionType) {
    setType(next);
    const current = options.categories.find((c) => c.id === categoryId);
    if (current && current.kind !== next) setCategoryId("");
  }

  const amountDefault =
    v?.amount ??
    (transaction
      ? toDecimalString(
          transaction.amountMinor < 0n
            ? -transaction.amountMinor
            : transaction.amountMinor,
          transaction.currency,
        )
      : "");

  return (
    <form onSubmit={submitWithoutReset(formAction)} className="grid gap-4">
      <FormMessage error={state.error} />
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <fieldset className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        <legend className="sr-only">Type</legend>
        {TRANSACTION_TYPES.map((t) => (
          <label key={t.value} className="relative">
            <input
              type="radio"
              name="type"
              value={t.value}
              checked={type === t.value}
              onChange={() => changeType(t.value)}
              className="peer absolute inset-0 z-10 size-full cursor-pointer appearance-none opacity-0"
            />
            <span
              className={cn(
                "block rounded-md py-1.5 text-center text-sm font-medium text-muted-foreground transition-colors peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
              )}
            >
              {t.label}
            </span>
          </label>
        ))}
      </fieldset>

      <MoneyInput
        name="amount"
        label="Amount"
        currency={currency}
        required
        defaultValue={amountDefault}
        placeholder="0.00"
        errors={errors?.amount}
      />

      <FormField
        name="description"
        label="Description"
        required
        maxLength={200}
        defaultValue={v?.description ?? transaction?.description}
        placeholder="e.g. Weekly groceries"
        errors={errors?.description}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="date"
          label="Date"
          type="date"
          required
          defaultValue={v?.date ?? transaction?.date ?? options.today}
          errors={errors?.date}
        />

        <div className="grid gap-1.5">
          <Label htmlFor="accountId">Account</Label>
          <NativeSelect
            id="accountId"
            name="accountId"
            className="w-full"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {options.accounts.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors?.accountId && (
            <p className="text-sm text-destructive">{errors.accountId[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="categoryId">Category</Label>
        <NativeSelect
          id="categoryId"
          name="categoryId"
          className="w-full"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <NativeSelectOption value="">Uncategorized</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {transaction?.categorySource === "ai" &&
          categoryId === transaction.categoryId && (
            <p className="text-xs text-muted-foreground">
              Picked by AI. Choosing a different category marks it as yours.
            </p>
          )}
        {errors?.categoryId && (
          <p className="text-sm text-destructive">{errors.categoryId[0]}</p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {footer}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
