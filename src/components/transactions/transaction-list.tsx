import { Sparkles } from "lucide-react";

import { CategoryChip } from "@/components/categories/category-visuals";
import { MoneyText } from "@/components/common/money-text";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/domain/dates/month";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "@/server/repos/transactions";

export function TransactionList({ rows }: { rows: TransactionRow[] }) {
  return (
    <Card className="py-0">
      <ul aria-label="Transactions" className="divide-y">
        {rows.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            {t.category ? (
              <CategoryChip color={t.category.color} icon={t.category.icon} />
            ) : (
              <span
                className="size-8 shrink-0 rounded-lg border border-dashed"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{t.description}</p>
              <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
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
              </p>
            </div>
            <MoneyText
              minor={t.amountMinor}
              currency={t.account.currency}
              className={cn(
                "shrink-0 font-medium",
                t.amountMinor > 0n && "text-green-700 dark:text-green-400",
              )}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
