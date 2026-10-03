"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { CategoryChip } from "@/components/categories/category-visuals";
import { MoneyText } from "@/components/common/money-text";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/domain/dates/month";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "@/server/repos/transactions";

import { TransactionDialog } from "./transaction-dialog";
import type {
  EditableTransaction,
  TransactionFormOptions,
} from "./transaction-form";

const toEditable = (t: TransactionRow): EditableTransaction => ({
  id: t.id,
  date: t.date,
  amountMinor: t.amountMinor,
  description: t.description,
  accountId: t.account.id,
  currency: t.account.currency,
  categoryId: t.category?.id ?? null,
  categorySource: t.category?.source ?? "none",
});

export function TransactionList({
  rows,
  options,
}: {
  rows: TransactionRow[];
  options: TransactionFormOptions;
}) {
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

  return (
    <Card className="py-0">
      <ul aria-label="Transactions" className="divide-y">
        {rows.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setEditing(toEditable(t))}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <span className="sr-only">Edit </span>
              {t.category ? (
                <CategoryChip color={t.category.color} icon={t.category.icon} />
              ) : (
                <span
                  className="size-8 shrink-0 rounded-lg border border-dashed"
                  aria-hidden
                />
              )}
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">{t.description}</span>
                <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                  <time dateTime={t.date}>{formatDate(t.date)}</time>
                  <span aria-hidden>·</span>
                  <span>{t.account.name}</span>
                  <span aria-hidden>·</span>
                  {t.category ? (
                    <span className="inline-flex items-center gap-1">
                      {t.category.name}
                      {t.category.source === "ai" && (
                        <Sparkles
                          className="size-3.5"
                          aria-label="Categorized by AI"
                        />
                      )}
                    </span>
                  ) : (
                    <span className="italic">Uncategorized</span>
                  )}
                </span>
              </span>
              <MoneyText
                minor={t.amountMinor}
                currency={t.account.currency}
                className={cn(
                  "shrink-0 font-medium",
                  t.amountMinor > 0n && "text-green-700 dark:text-green-400",
                )}
              />
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <TransactionDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          transaction={editing}
          options={options}
        />
      )}
    </Card>
  );
}
