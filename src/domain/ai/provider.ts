import type { CategoryKind } from "@/domain/categories/categories";

/**
 * What an AI categorizer sees. Deliberately minimal (see "Gemini privacy" in
 * docs/PLAN.md): a normalized description, the direction and a rough amount
 * range. No user, account or transaction ids, no exact amounts or balances.
 * Keys are short per-request placeholders the pipeline maps back.
 */
export type CategorizeItem = {
  key: string;
  description: string;
  direction: CategoryKind;
  amountRange: string;
};

/** One of the user's categories, by name only. */
export type CategoryChoice = {
  key: string;
  name: string;
  kind: CategoryKind;
};

export type CategorizeResult = {
  key: string;
  /** null when the provider isn't sure. */
  categoryKey: string | null;
  /** 0 to 1. */
  confidence: number;
};

/**
 * Anything that can suggest categories: Gemini in production, a fake in
 * tests. May throw (rate limits, network); the pipeline copes.
 */
export interface CategorizationProvider {
  categorize(
    items: CategorizeItem[],
    categories: CategoryChoice[],
  ): Promise<CategorizeResult[]>;
}
