import "server-only";

import { cache } from "react";

import type { TransactionFormOptions } from "@/components/transactions/transaction-form";
import { today } from "@/domain/dates/month";
import type { SessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listAccountOptions } from "@/server/repos/accounts";
import { listCategories } from "@/server/repos/categories";

/**
 * Accounts, categories and today's date for the transaction form. Cached per
 * request: the layout's quick add and the transactions page share it.
 */
export const loadTransactionFormOptions = cache(
  async (user: SessionUser): Promise<TransactionFormOptions> => {
    const supabase = await createClient();
    const [accounts, categories, profile] = await Promise.all([
      listAccountOptions(supabase),
      listCategories(supabase),
      supabase.from("profiles").select("timezone").eq("id", user.id).single(),
    ]);
    return {
      accounts,
      categories,
      today: today(profile.data?.timezone ?? "UTC"),
    };
  },
);
