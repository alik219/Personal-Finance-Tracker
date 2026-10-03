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
import type { FormState } from "@/lib/validation/form";
import { deleteAccount } from "@/server/actions/accounts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: { id: string; name: string };
};

export function DeleteAccountDialog({ open, onOpenChange, account }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <DeleteForm account={account} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteForm({
  account,
  onDone,
}: {
  account: Props["account"];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteAccount,
    {} as FormState,
  );
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Delete {account.name}?</DialogTitle>
        <DialogDescription>
          This permanently deletes the account and every transaction in it. It
          can&apos;t be undone.
        </DialogDescription>
      </DialogHeader>

      <FormMessage error={state.error} />
      <input type="hidden" name="id" value={account.id} />
      <FormField
        name="confirmName"
        label={`Type "${account.name}" to confirm`}
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        errors={state.fieldErrors?.confirmName}
      />

      <DialogFooter>
        <Button
          type="submit"
          variant="destructive"
          disabled={pending || typed.trim() !== account.name}
        >
          {pending ? "Deleting…" : "Delete account"}
        </Button>
      </DialogFooter>
    </form>
  );
}
