import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { CATEGORY_KINDS } from "@/domain/categories/categories";
import type { Category } from "@/server/repos/categories";
import {
  filtersToSearchParams,
  hasFilters,
  type TransactionFilters,
} from "@/lib/validation/transaction-filters";

/**
 * A plain GET form: filters live in the URL, so they survive reloads and can
 * be shared, and the form works before JavaScript loads.
 */
export function TransactionFiltersForm({
  filters,
  accounts,
  categories,
}: {
  filters: TransactionFilters;
  accounts: { id: string; name: string }[];
  categories: Category[];
}) {
  return (
    <Form
      // Remount when the URL changes so fields show the applied filters
      // (e.g. after "Clear").
      key={filtersToSearchParams({ ...filters, page: 1 }).toString()}
      action="/transactions"
      role="search"
      aria-label="Filter transactions"
      className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q"
          type="search"
          maxLength={100}
          defaultValue={filters.q}
          placeholder="Description"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="account">Account</Label>
        <NativeSelect
          id="account"
          name="account"
          className="w-full"
          defaultValue={filters.accountId ?? ""}
        >
          <NativeSelectOption value="">All accounts</NativeSelectOption>
          {accounts.map((a) => (
            <NativeSelectOption key={a.id} value={a.id}>
              {a.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="category">Category</Label>
        <NativeSelect
          id="category"
          name="category"
          className="w-full"
          defaultValue={filters.category ?? ""}
        >
          <NativeSelectOption value="">All categories</NativeSelectOption>
          <NativeSelectOption value="none">Uncategorized</NativeSelectOption>
          {CATEGORY_KINDS.map((kind) => (
            <NativeSelectOptGroup key={kind.value} label={kind.label}>
              {categories
                .filter((c) => c.kind === kind.value)
                .map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.hidden ? `${c.name} (hidden)` : c.name}
                  </NativeSelectOption>
                ))}
            </NativeSelectOptGroup>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="from">From</Label>
        <Input id="from" name="from" type="date" defaultValue={filters.from} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="to">To</Label>
        <Input id="to" name="to" type="date" defaultValue={filters.to} />
      </div>

      <div className="flex gap-2 sm:col-span-2 lg:col-span-6 lg:justify-end">
        {hasFilters(filters) && (
          <Link
            href="/transactions"
            className={buttonVariants({ variant: "ghost" })}
          >
            Clear filters
          </Link>
        )}
        <Button type="submit">Apply filters</Button>
      </div>
    </Form>
  );
}
