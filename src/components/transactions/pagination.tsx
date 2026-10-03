import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  filtersToSearchParams,
  type TransactionFilters,
} from "@/lib/validation/transaction-filters";

const count = new Intl.NumberFormat("en-US");

export function Pagination({
  filters,
  total,
  pageSize,
}: {
  filters: TransactionFilters;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const href = (p: number) => {
    const query = filtersToSearchParams({ ...filters, page: p }).toString();
    return query ? `/transactions?${query}` : "/transactions";
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {count.format(first)}–{count.format(last)} of{" "}
        {count.format(total)}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Page {page} of {pages}
        </span>
        <PageLink href={page > 1 ? href(page - 1) : undefined} label="Previous">
          <ChevronLeft aria-hidden />
        </PageLink>
        <PageLink href={page < pages ? href(page + 1) : undefined} label="Next">
          <ChevronRight aria-hidden />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <Button
        variant="outline"
        size="icon"
        disabled
        aria-label={`${label} page`}
      >
        {children}
      </Button>
    );
  }
  return (
    <Link
      href={href}
      aria-label={`${label} page`}
      className={buttonVariants({ variant: "outline", size: "icon" })}
    >
      {children}
    </Link>
  );
}
