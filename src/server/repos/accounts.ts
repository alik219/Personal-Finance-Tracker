import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountType } from "@/domain/accounts/account-types";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor: bigint;
  balanceMinor: bigint;
};

// Postgres bigint arrives as a JSON number; money is always bigint in the app.
const toMinor = (value: number | null) => BigInt(value ?? 0);

export async function listAccounts(supabase: Client): Promise<Account[]> {
  const [accounts, balances] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, currency, opening_balance_minor")
      .order("name"),
    supabase.from("account_balances").select("account_id, balance_minor"),
  ]);
  if (accounts.error) throw accounts.error;
  if (balances.error) throw balances.error;

  const balanceById = new Map(
    balances.data.map((b) => [b.account_id, toMinor(b.balance_minor)]),
  );
  return accounts.data.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    openingBalanceMinor: toMinor(a.opening_balance_minor),
    balanceMinor: balanceById.get(a.id) ?? toMinor(a.opening_balance_minor),
  }));
}

export async function getAccount(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, currency")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type AccountInput = {
  name: string;
  type: AccountType;
  openingBalance: bigint;
};

export function insertAccount(
  supabase: Client,
  input: AccountInput & { currency: string },
) {
  return supabase.from("accounts").insert({
    name: input.name,
    type: input.type,
    currency: input.currency,
    opening_balance_minor: Number(input.openingBalance),
  });
}

export function updateAccount(
  supabase: Client,
  id: string,
  input: AccountInput,
) {
  return supabase
    .from("accounts")
    .update({
      name: input.name,
      type: input.type,
      opening_balance_minor: Number(input.openingBalance),
    })
    .eq("id", id);
}

export function deleteAccount(supabase: Client, id: string) {
  return supabase.from("accounts").delete().eq("id", id);
}
