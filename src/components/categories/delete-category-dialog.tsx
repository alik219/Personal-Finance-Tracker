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
import { deleteCategory } from "@/server/actions/categories";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { id: string; name: string };
};

export function DeleteCategoryDialog({ open, onOpenChange, category }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <DeleteForm category={category} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteForm({
  category,
  onDone,
}: {
  category: Props["category"];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteCategory,
    {} as FormState,
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Delete {category.name}?</DialogTitle>
        <DialogDescription>
          Its transactions become uncategorized and its budgets are removed. To
          keep the history instead, hide the category.
        </DialogDescription>
      </DialogHeader>

      <FormMessage error={state.error} />
      <input type="hidden" name="id" value={category.id} />

      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>
          Cancel
        </DialogClose>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete category"}
        </Button>
      </DialogFooter>
    </form>
  );
}
