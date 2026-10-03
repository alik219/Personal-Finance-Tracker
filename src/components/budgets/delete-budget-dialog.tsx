"use client";

import { useActionState, useEffect } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormState } from "@/lib/validation/form";
import { deleteBudget } from "@/server/actions/budgets";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: { id: string; categoryName: string; monthLabel: string };
};

export function DeleteBudgetDialog({ open, onOpenChange, budget }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <DeleteForm budget={budget} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteForm({
  budget,
  onDone,
}: {
  budget: Props["budget"];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteBudget,
    {} as FormState,
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Delete {budget.categoryName} budget?</DialogTitle>
        <DialogDescription>
          Removes the limit for {budget.monthLabel}. Your transactions stay as
          they are.
        </DialogDescription>
      </DialogHeader>
      <FormMessage error={state.error} />
      <input type="hidden" name="id" value={budget.id} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>
          Cancel
        </DialogClose>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete budget"}
        </Button>
      </DialogFooter>
    </form>
  );
}
