import { Upload } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Import" };

export default function Page() {
  return (
    <>
      <PageHeader title="Import" />
      <EmptyState
        icon={Upload}
        title="Coming soon"
        description="Import transactions from your bank's CSV statements."
      />
    </>
  );
}
