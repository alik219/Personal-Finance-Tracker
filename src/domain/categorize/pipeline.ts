import { amountRange } from "@/domain/ai/amount-range";
import type {
  CategorizationProvider,
  CategorizeItem,
  CategoryChoice,
} from "@/domain/ai/provider";
import type { CategoryKind } from "@/domain/categories/categories";
import type { CategorySource } from "@/domain/transactions/category-source";

export type PipelineTransaction = {
  id: string;
  normalizedDescription: string;
  amountMinor: bigint;
  currency: string;
  categoryId: string | null;
  categorySource: CategorySource;
};

export type PipelineCategory = {
  id: string;
  name: string;
  kind: CategoryKind;
  hidden: boolean;
};

export type PipelineOptions = {
  /** Unique descriptions per provider call (free-tier friendly). */
  batchSize?: number;
  /** Suggestions below this confidence are ignored. */
  minConfidence?: number;
};

export type PipelineResult = {
  /** Rows to save with category_source = 'ai'. */
  updates: { id: string; categoryId: string }[];
  /** Rows that were uncategorized and still are. */
  leftUncategorized: number;
  /** Rows not sent because they already had a category (manual or AI). */
  skipped: number;
  /** Provider calls that threw; their rows stay uncategorized. */
  failedBatches: number;
};

const directionOf = (amountMinor: bigint): CategoryKind =>
  amountMinor < 0n ? "expense" : "income";

/**
 * Suggests categories for uncategorized transactions.
 *
 * - Only rows with source 'none' are considered: manual picks and earlier AI
 *   picks are never touched.
 * - Rows sharing a normalized description and direction are sent once.
 * - The provider sees short keys, not ids; every answer is checked against
 *   the user's visible categories of the right kind before it's used.
 * - A failing batch leaves its rows uncategorized; the rest still run.
 */
export async function categorizeTransactions(
  transactions: PipelineTransaction[],
  categories: PipelineCategory[],
  provider: CategorizationProvider,
  { batchSize = 50, minConfidence = 0.5 }: PipelineOptions = {},
): Promise<PipelineResult> {
  const candidates = transactions.filter((t) => t.categorySource === "none");
  const skipped = transactions.length - candidates.length;

  const visible = categories.filter((c) => !c.hidden);
  const choices: CategoryChoice[] = visible.map((c, i) => ({
    key: `c${i + 1}`,
    name: c.name,
    kind: c.kind,
  }));
  const categoryByKey = new Map(choices.map((c, i) => [c.key, visible[i]]));

  // One item per (direction, description); remember which rows it covers.
  const groups = new Map<string, { item: CategorizeItem; ids: string[] }>();
  for (const t of candidates) {
    // Number-only descriptions normalize to "": nothing for a model to read.
    if (t.normalizedDescription === "") continue;
    const direction = directionOf(t.amountMinor);
    const groupKey = `${direction}|${t.normalizedDescription}`;
    const group = groups.get(groupKey);
    if (group) {
      group.ids.push(t.id);
    } else {
      groups.set(groupKey, {
        item: {
          key: `t${groups.size + 1}`,
          description: t.normalizedDescription,
          direction,
          amountRange: amountRange(t.amountMinor, t.currency),
        },
        ids: [t.id],
      });
    }
  }

  const all = [...groups.values()];
  const byItemKey = new Map(all.map((g) => [g.item.key, g]));
  const updates: PipelineResult["updates"] = [];
  let failedBatches = 0;

  if (choices.length > 0) {
    for (let start = 0; start < all.length; start += batchSize) {
      const batch = all.slice(start, start + batchSize);
      const batchKeys = new Set(batch.map((g) => g.item.key));
      let results;
      try {
        results = await provider.categorize(
          batch.map((g) => g.item),
          choices,
        );
      } catch {
        failedBatches += 1;
        continue;
      }

      const answered = new Set<string>();
      for (const r of results) {
        // Ignore answers for items not in this batch, or repeated answers.
        if (!batchKeys.has(r.key) || answered.has(r.key)) continue;
        answered.add(r.key);
        if (r.categoryKey === null) continue;
        if (!(r.confidence >= minConfidence)) continue;
        const group = byItemKey.get(r.key)!;
        const category = categoryByKey.get(r.categoryKey);
        if (!category || category.kind !== group.item.direction) continue;
        for (const id of group.ids)
          updates.push({ id, categoryId: category.id });
      }
    }
  }

  return {
    updates,
    leftUncategorized: candidates.length - updates.length,
    skipped,
    failedBatches,
  };
}
