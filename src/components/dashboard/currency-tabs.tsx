import Link from "next/link";

import { cn } from "@/lib/utils";

/** One link per currency: totals are never mixed across currencies. */
export function CurrencyTabs({
  currencies,
  selected,
  href,
}: {
  currencies: string[];
  selected: string;
  href: (currency: string) => string;
}) {
  if (currencies.length < 2) return null;
  return (
    <nav aria-label="Currency" className="flex gap-1 rounded-lg bg-muted p-1">
      {currencies.map((c) => (
        <Link
          key={c}
          href={href(c)}
          aria-current={c === selected ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors",
            c === selected && "bg-background text-foreground shadow-sm",
          )}
        >
          {c}
        </Link>
      ))}
    </nav>
  );
}
