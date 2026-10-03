import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { addMonths, formatMonth, type MonthKey } from "@/domain/dates/month";

/** Previous / next month links; the month lives in the URL. */
export function MonthPicker({
  month,
  current,
  href,
}: {
  month: MonthKey;
  current: MonthKey;
  /** The page URL showing month `m`. */
  href: (m: MonthKey) => string;
}) {
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);

  return (
    <nav aria-label="Month" className="flex items-center gap-1">
      <Link
        href={href(prev)}
        aria-label={`Previous month, ${formatMonth(prev)}`}
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <ChevronLeft aria-hidden />
      </Link>
      <p className="min-w-36 text-center font-medium" aria-live="polite">
        {formatMonth(month)}
      </p>
      <Link
        href={href(next)}
        aria-label={`Next month, ${formatMonth(next)}`}
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <ChevronRight aria-hidden />
      </Link>
      {month !== current && (
        <Link
          href={href(current)}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          This month
        </Link>
      )}
    </nav>
  );
}
