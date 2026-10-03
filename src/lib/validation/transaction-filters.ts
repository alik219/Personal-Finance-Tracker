import { z } from "zod";

export const PAGE_SIZE = 50;

/** Filters for the transactions list, read from the URL. */
export type TransactionFilters = {
  accountId?: string;
  /** A category id, or "none" for uncategorized. */
  category?: string;
  from?: string;
  to?: string;
  q?: string;
  page: number;
};

const isoDate = z.iso.date();

/** Values that don't parse are ignored rather than shown as errors. */
const optional = <T extends z.ZodType>(schema: T) =>
  z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
      schema.optional(),
    )
    .catch(undefined);

const schema = z.object({
  account: optional(z.uuid()),
  category: optional(z.union([z.literal("none"), z.uuid()])),
  from: optional(isoDate),
  to: optional(isoDate),
  q: optional(z.string().max(100)),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

type SearchParams = Record<string, string | string[] | undefined>;

export function parseTransactionFilters(
  params: SearchParams,
): TransactionFilters {
  // Repeated params (?q=a&q=b) use the first value.
  const first = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const { account, category, from, to, q, page } = schema.parse(first);
  return {
    accountId: account,
    category,
    from,
    to,
    q,
    page: page ?? 1,
  };
}

/** True when any filter (not just the page) is set. */
export function hasFilters(filters: TransactionFilters): boolean {
  const { accountId, category, from, to, q } = filters;
  return [accountId, category, from, to, q].some((v) => v !== undefined);
}

/** Back to URL params, e.g. for pagination links. Omits empty values. */
export function filtersToSearchParams(
  filters: TransactionFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.accountId) params.set("account", filters.accountId);
  if (filters.category) params.set("category", filters.category);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q) params.set("q", filters.q);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

/** Escapes LIKE wildcards so user text matches literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
