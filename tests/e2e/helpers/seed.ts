import { adminClient } from "./users";

/** A transaction as the seed generator describes it, before ids are known. */
export type SeedTransaction = {
  account: "Checking" | "Travel Wallet";
  date: string;
  amountMinor: number;
  description: string;
  category: "Groceries" | "Dining out" | "Salary" | null;
};

export const SEED_ACCOUNTS = [
  { name: "Checking", type: "checking", currency: "USD", opening: 100_000 },
  { name: "Travel Wallet", type: "cash", currency: "EUR", opening: 0 },
] as const;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic rows, so tests can compute expected counts with the same
 * function. Four rows per day from 2026-01-01; every 4th is uncategorized,
 * every 10th mentions Netflix, 3 in 5 are in Checking.
 */
export function seedTransactions(count = 1000): SeedTransaction[] {
  return Array.from({ length: count }, (_, i) => {
    const category =
      i % 4 === 0
        ? null
        : i % 20 === 1
          ? "Salary"
          : i % 2 === 0
            ? "Groceries"
            : "Dining out";
    const description =
      i % 10 === 3
        ? `NETFLIX.COM ${i}`
        : category === "Salary"
          ? "ACME Payroll"
          : category === "Groceries"
            ? `Whole Foods Market #${i}`
            : category === "Dining out"
              ? "Cafe Luna"
              : `Card payment ${i}`;
    return {
      account: i % 5 < 3 ? "Checking" : "Travel Wallet",
      date: addDays("2026-01-01", Math.floor(i / 4)),
      amountMinor: category === "Salary" ? 300_000 : -(100 + ((i * 37) % 9000)),
      description,
      category,
    };
  });
}

/** Creates the seed accounts for a user. Returns their ids by name. */
export async function seedAccounts(userId: string) {
  const db = adminClient();
  const { data, error } = await db
    .from("accounts")
    .insert(
      SEED_ACCOUNTS.map((a) => ({
        user_id: userId,
        name: a.name,
        type: a.type,
        currency: a.currency,
        opening_balance_minor: a.opening,
      })),
    )
    .select("id, name");
  if (error) throw error;
  return Object.fromEntries(data.map((a) => [a.name, a.id as string]));
}

/** Inserts rows for a user (bypassing RLS) into the seed accounts. */
export async function seedUserTransactions(
  userId: string,
  rows: SeedTransaction[],
) {
  const db = adminClient();
  const accountIds = await seedAccounts(userId);
  const { data: categories, error: catError } = await db
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);
  if (catError) throw catError;
  const categoryIds = Object.fromEntries(
    categories.map((c) => [c.name, c.id as string]),
  );

  const { error } = await db.from("transactions").insert(
    rows.map((r) => ({
      user_id: userId,
      account_id: accountIds[r.account],
      date: r.date,
      amount_minor: r.amountMinor,
      description: r.description,
      category_id: r.category && categoryIds[r.category],
      category_source: r.category ? "manual" : "none",
    })),
  );
  if (error) throw error;
  return { accountIds, categoryIds };
}
