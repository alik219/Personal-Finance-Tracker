"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Placeholder: backlog task 16 replaces the sheet body with the
// transaction form.
export function QuickAddFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon-lg"
        aria-label="Quick add transaction"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-40 size-12 rounded-full shadow-lg md:right-6 md:bottom-6"
      >
        <Plus className="size-6" aria-hidden />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add a transaction</SheetTitle>
            <SheetDescription>
              Quick add is coming soon. You&apos;ll be able to log an expense or
              income from any page.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  );
}
