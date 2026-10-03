import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  colorOrDefault,
  iconOrDefault,
  type CategoryColor,
  type CategoryIcon,
} from "@/domain/categories/categories";
import type { Database } from "@/lib/supabase/types";
import {
  escapeLike,
  PAGE_SIZE,
  type TransactionFilters,
} from "@/lib/validation/transaction-filters";

type Client = SupabaseClient<Database>;
type CategorySource = Database["public"]["Enums"]["category_source"];

export type TransactionRow = {
  id: string;
  date: string;
  amountMinor: bigint;
  description: string;
  account: { id: string; name: string; currency: string };
  category: {
    id: string;
    name: string;
    color: CategoryColor;
    icon: CategoryIcon;
    source: CategorySource;
  } | null;
};

export type TransactionPage = {
  rows: TransactionRow[];
  /** Matching rows across all pages. */
  total: number;
  page: number;
  pageSize: number;
};

/** One page of the user's transactions, newest first. */
export async function listTransactions(
  supabase: Client,
  filters: TransactionFilters,
): Promise<TransactionPage> {
  let query = supabase.from("transactions").select(
    `id, date, amount_minor, description, category_source,
       account:accounts!transactions_account_id_user_id_fkey (id, name, currency),
       category:categories!transactions_category_id_user_id_fkey (id, name, color, icon)`,
    { count: "exact" },
  );

  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.category === "none") query = query.is("category_id", null);
  else if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.from) query = query.gte("date", filters.from);
  if (filters.to) query = query.lte("date", filters.to);
  if (filters.q)
    query = query.ilike("description", `%${escapeLike(filters.q)}%`);

  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  // Asking for a page past the end is a 416 from PostgREST; treat as empty.
  if (error?.code === "PGRST103") {
    return {
      rows: [],
      total: count ?? 0,
      page: filters.page,
      pageSize: PAGE_SIZE,
    };
  }
  if (error) throw error;

  return {
    rows: data.map((t) => ({
      id: t.id,
      date: t.date,
      // Postgres bigint arrives as a JSON number; money is always bigint.
      amountMinor: BigInt(t.amount_minor),
      description: t.description,
      account: t.account,
      category: t.category && {
        id: t.category.id,
        name: t.category.name,
        color: colorOrDefault(t.category.color),
        icon: iconOrDefault(t.category.icon),
        source: t.category_source,
      },
    })),
    total: count ?? 0,
    page: filters.page,
    pageSize: PAGE_SIZE,
  };
}
