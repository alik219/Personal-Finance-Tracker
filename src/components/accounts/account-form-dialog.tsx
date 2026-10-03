"use client";

import { useActionState, useEffect, useState } from "react";

import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
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
import {
  ACCOUNT_TYPES,
  type AccountType,
} from "@/domain/accounts/account-types";
import type { CurrencyOption } from "@/domain/money/currencies";
import { toDecimalString } from "@/domain/money/money";
import type { FormState } from "@/lib/validation/form";
import { createAccount, updateAccount } from "@/server/actions/accounts";

export type EditableAccount = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor: bigint;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to create a new account. */
  account?: EditableAccount;
  currencies: CurrencyOption[];
  defaultCurrency: string;
};

export function AccountFormDialog({ open, onOpenChange, ...formProps }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open, so each opening starts with a fresh form. */}
        {open && (
          <AccountForm {...formProps} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({
  account,
  currencies,
  defaultCurrency,
  onDone,
}: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const editing = Boolean(account);
  const [state, formAction, pending] = useActionState(
    editing ? updateAccount : createAccount,
    {} as FormState,
  );
  const [currency, setCurrency] = useState(
    account?.currency ?? defaultCurrency,
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  const v = state.values;
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit account" : "Add account"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Change the name, type or opening balance."
            : "Add a bank account, card, or cash you want to track."}
        </DialogDescription>
      </DialogHeader>

      <FormMessage error={state.error} />
      {account && <input type="hidden" name="id" value={account.id} />}

      <FormField
        name="name"
        label="Name"
        required
        maxLength={60}
        defaultValue={v?.name ?? account?.name}
        placeholder="e.g. Main Checking"
        errors={errors?.name}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="type">Type</Label>
        <NativeSelect
          id="type"
          name="type"
          className="w-full"
          defaultValue={v?.type ?? account?.type ?? "checking"}
        >
          {ACCOUNT_TYPES.map((t) => (
            <NativeSelectOption key={t.value} value={t.value}>
              {t.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="currency">Currency</Label>
        <NativeSelect
          id="currency"
          name="currency"
          className="w-full"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          disabled={editing}
          aria-describedby={editing ? "currency-hint" : undefined}
        >
          {currencies.map((c) => (
            <NativeSelectOption key={c.code} value={c.code}>
              {c.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {editing && (
          <p id="currency-hint" className="text-xs text-muted-foreground">
            The currency can&apos;t be changed after an account is created.
          </p>
        )}
        {errors?.currency && (
          <p className="text-sm text-destructive">{errors.currency[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <FormField
          name="openingBalance"
          label={`Opening balance (${currency})`}
          inputMode="decimal"
          defaultValue={
            v?.openingBalance ??
            (account
              ? toDecimalString(account.openingBalanceMinor, account.currency)
              : "")
          }
          placeholder="0.00"
          errors={errors?.openingBalance}
        />
        <p className="text-xs text-muted-foreground">
          For credit cards and loans, enter what you owe as a negative number.
        </p>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add account"}
        </Button>
      </DialogFooter>
    </form>
  );
}
