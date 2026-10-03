import { PiggyBank } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Budgets" };

export default function Page() {
  return (
    <>
      <PageHeader title="Budgets" />
      <EmptyState
        icon={PiggyBank}
        title="Coming soon"
        description="Set monthly limits per category and track your spending."
      />
    </>
  );
}
