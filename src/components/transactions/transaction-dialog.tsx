"use client";

import { useActionState, useEffect, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormState } from "@/lib/validation/form";
import { deleteTransaction } from "@/server/actions/transactions";

import {
  TransactionForm,
  type EditableTransaction,
  type TransactionFormOptions,
} from "./transaction-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: EditableTransaction;
  options: TransactionFormOptions;
};

/** Edit a transaction, or delete it after a second click. */
export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  options,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {confirmingDelete ? (
          <DeleteConfirm
            transaction={transaction}
            onCancel={() => setConfirmingDelete(false)}
            onDone={close}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit transaction</DialogTitle>
              <DialogDescription>
                Change any detail, or delete it.
              </DialogDescription>
            </DialogHeader>
            <TransactionForm
              options={options}
              transaction={transaction}
              onDone={close}
              footer={
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive sm:mr-auto"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete
                </Button>
              }
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirm({
  transaction,
  onCancel,
  onDone,
}: {
  transaction: EditableTransaction;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteTransaction,
    {} as FormState,
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Delete this transaction?</DialogTitle>
        <DialogDescription>
          &ldquo;{transaction.description}&rdquo; will be removed and the
          account balance updated. This can&apos;t be undone.
        </DialogDescription>
      </DialogHeader>
      <FormMessage error={state.error} />
      <input type="hidden" name="id" value={transaction.id} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete transaction"}
        </Button>
      </div>
    </form>
  );
}
