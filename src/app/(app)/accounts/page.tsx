import type { Metadata } from "next";

import { AccountsView } from "@/components/accounts/accounts-view";
import { currencyOptions } from "@/domain/money/currencies";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/server/repos/accounts";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [accounts, profile] = await Promise.all([
    listAccounts(supabase),
    supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <AccountsView
      accounts={accounts}
      currencies={currencyOptions()}
      defaultCurrency={profile.data?.default_currency ?? "USD"}
    />
  );
}
