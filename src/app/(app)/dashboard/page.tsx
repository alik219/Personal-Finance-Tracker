import type { Metadata } from "next";

import { FormMessage } from "@/components/auth/form-message";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const NOTICES: Record<string, string> = {
  password_updated: "Your password has been updated.",
};

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { notice } = await searchParams;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="grid gap-4">
      {typeof notice === "string" && <FormMessage success={NOTICES[notice]} />}
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {profile?.display_name ?? user.email}
      </h1>
      <p className="text-muted-foreground">
        Your dashboard is coming soon: accounts, budgets and goals will show up
        here.
      </p>
    </div>
  );
}
