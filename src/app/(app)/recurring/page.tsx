import { Repeat } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Recurring" };

export default function Page() {
  return (
    <>
      <PageHeader title="Recurring" />
      <EmptyState
        icon={Repeat}
        title="Coming soon"
        description="Bills and subscriptions that repeat on a schedule."
      />
    </>
  );
}
