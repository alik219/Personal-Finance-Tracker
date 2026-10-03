import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  colorOrDefault,
  iconOrDefault,
  type CategoryColor,
  type CategoryIcon,
} from "@/domain/categories/categories";
import type { PipelineTransaction } from "@/domain/categorize/pipeline";
import { normalizeDescription } from "@/domain/text/normalize";
import type { CategorySource } from "@/domain/transactions/category-source";
import type { Database } from "@/lib/supabase/types";
import {
  escapeLike,
  PAGE_SIZE,
  type TransactionFilters,
} from "@/lib/validation/transaction-filters";

type Client = SupabaseClient<Database>;

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

export async function getTransaction(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, description, category_id, category_source")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type TransactionInput = {
  accountId: string;
  date: string;
  amountMinor: bigint;
  description: string;
  normalizedDescription: string;
  categoryId: string | null;
  categorySource: CategorySource;
};

function toRow(input: TransactionInput) {
  return {
    account_id: input.accountId,
    date: input.date,
    amount_minor: Number(input.amountMinor),
    description: input.description,
    normalized_description: input.normalizedDescription,
    category_id: input.categoryId,
    category_source: input.categorySource,
  };
}

export function insertTransaction(supabase: Client, input: TransactionInput) {
  return supabase.from("transactions").insert(toRow(input));
}

export function updateTransaction(
  supabase: Client,
  id: string,
  input: TransactionInput,
) {
  return supabase.from("transactions").update(toRow(input)).eq("id", id);
}

export function deleteTransaction(supabase: Client, id: string) {
  return supabase.from("transactions").delete().eq("id", id);
}

/** Uncategorized rows for the AI pipeline, newest first. */
export async function listUncategorized(
  supabase: Client,
  limit: number,
): Promise<PipelineTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, description, normalized_description, amount_minor, category_id, category_source,
       account:accounts!transactions_account_id_user_id_fkey (currency)`,
    )
    .eq("category_source", "none")
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    // Older rows may predate the stored normalized text.
    normalizedDescription:
      t.normalized_description || normalizeDescription(t.description),
    amountMinor: BigInt(t.amount_minor),
    currency: t.account.currency,
    categoryId: t.category_id,
    categorySource: t.category_source,
  }));
}

export async function countUncategorized(supabase: Client): Promise<number> {
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_source", "none");
  if (error) throw error;
  return count ?? 0;
}

/**
 * Saves AI picks, one request per category (and per 100 ids, to keep URLs
 * short). Rows the user categorized meanwhile are left alone. Returns how
 * many rows changed.
 */
export async function applyAiCategories(
  supabase: Client,
  updates: { id: string; categoryId: string }[],
): Promise<number> {
  const idsByCategory = new Map<string, string[]>();
  for (const { id, categoryId } of updates) {
    idsByCategory.set(categoryId, [
      ...(idsByCategory.get(categoryId) ?? []),
      id,
    ]);
  }

  const requests = [...idsByCategory].flatMap(([categoryId, ids]) =>
    Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) =>
      supabase
        .from("transactions")
        .update({ category_id: categoryId, category_source: "ai" })
        .in("id", ids.slice(i * 100, (i + 1) * 100))
        .eq("category_source", "none")
        .select("id"),
    ),
  );

  let changed = 0;
  for (const { data, error } of await Promise.all(requests)) {
    if (error) throw error;
    changed += data.length;
  }
  return changed;
}
