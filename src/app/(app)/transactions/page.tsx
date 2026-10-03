import { ArrowLeftRight } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Transactions" };

export default function Page() {
  return (
    <>
      <PageHeader title="Transactions" />
      <EmptyState
        icon={ArrowLeftRight}
        title="Coming soon"
        description="Add, search and categorize your income and expenses."
      />
    </>
  );
}
