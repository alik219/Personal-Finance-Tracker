import { Settings } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" />
      <EmptyState
        icon={Settings}
        title="Coming soon"
        description="Profile, categories, rules, security and your data."
      />
    </>
  );
}
