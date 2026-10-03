"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  TransactionForm,
  type TransactionFormOptions,
} from "@/components/transactions/transaction-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** The floating + button: add a transaction from any page. */
export function QuickAddFab({ options }: { options: TransactionFormOptions }) {
  const [open, setOpen] = useState(false);
  const hasAccounts = options.accounts.length > 0;

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
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add a transaction</SheetTitle>
            <SheetDescription>
              {hasAccounts
                ? "Log an expense or income."
                : "Transactions belong to an account. Add one first."}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {!hasAccounts ? (
              <Link
                href="/accounts"
                onClick={() => setOpen(false)}
                className={buttonVariants()}
              >
                Go to accounts
              </Link>
            ) : (
              // Mounted only while open, so each opening starts fresh.
              open && (
                <TransactionForm
                  options={options}
                  onDone={() => setOpen(false)}
                />
              )
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
