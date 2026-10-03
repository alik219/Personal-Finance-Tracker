import { Target } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Goals" };

export default function Page() {
  return (
    <>
      <PageHeader title="Goals" />
      <EmptyState
        icon={Target}
        title="Coming soon"
        description="Savings goals with target amounts and deadlines."
      />
    </>
  );
}
