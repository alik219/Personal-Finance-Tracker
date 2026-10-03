import { ArrowLeftRight, SearchX, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/transactions/pagination";
import { TransactionFiltersForm } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  hasFilters,
  parseTransactionFilters,
} from "@/lib/validation/transaction-filters";
import { listAccounts } from "@/server/repos/accounts";
import { listCategories } from "@/server/repos/categories";
import { listTransactions } from "@/server/repos/transactions";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  await requireUser();
  const filters = parseTransactionFilters(await searchParams);
  const supabase = await createClient();

  const [accounts, categories, result] = await Promise.all([
    listAccounts(supabase),
    listCategories(supabase),
    listTransactions(supabase, filters),
  ]);

  const header = (
    <PageHeader
      title="Transactions"
      description="Your income and expenses, newest first."
    />
  );

  if (accounts.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Wallet}
          title="Add an account first"
          description="Transactions belong to an account, like a bank account, card or cash."
          action={
            <Link href="/accounts" className={buttonVariants()}>
              Go to accounts
            </Link>
          }
        />
      </>
    );
  }

  const filtered = hasFilters(filters);
  if (result.total === 0 && !filtered) {
    return (
      <>
        {header}
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions yet"
          description="Transactions you add will show up here."
        />
      </>
    );
  }

  return (
    <>
      {header}
      <TransactionFiltersForm
        filters={filters}
        accounts={accounts}
        categories={categories}
      />
      {result.rows.length > 0 ? (
        <>
          <TransactionList rows={result.rows} />
          <Pagination
            filters={filters}
            total={result.total}
            pageSize={result.pageSize}
          />
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title={
            result.total > 0
              ? "This page is empty"
              : "No transactions match these filters"
          }
          description="Try a wider date range or fewer filters."
          action={
            <Link
              href="/transactions"
              className={buttonVariants({ variant: "outline" })}
            >
              Clear filters
            </Link>
          }
        />
      )}
    </>
  );
}
