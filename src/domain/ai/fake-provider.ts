import type {
  CategorizationProvider,
  CategorizeItem,
  CategorizeResult,
  CategoryChoice,
} from "./provider";

/** Words that point at a category name, for the fake provider. */
const DEFAULT_KEYWORDS: Record<string, string[]> = {
  groceries: ["grocery", "supermarket", "whole foods", "tesco", "aldi"],
  "dining out": ["cafe", "coffee", "restaurant", "pizza", "starbucks"],
  transport: ["uber", "lyft", "taxi", "metro", "fuel", "shell"],
  utilities: ["electric", "water", "internet", "gas bill"],
  entertainment: ["netflix", "spotify", "cinema"],
  salary: ["payroll", "salary", "wages"],
};

/**
 * Deterministic stand-in for a real model: picks the category whose name, or
 * one of its keywords, appears in the description. Used by unit tests and by
 * E2E runs (no network, no API key).
 */
export function createFakeProvider(
  keywords: Record<string, string[]> = DEFAULT_KEYWORDS,
): CategorizationProvider {
  return {
    async categorize(
      items: CategorizeItem[],
      categories: CategoryChoice[],
    ): Promise<CategorizeResult[]> {
      return items.map((item) => {
        const match = categories.find((c) => {
          if (c.kind !== item.direction) return false;
          const name = c.name.toLowerCase();
          const words = [name, ...(keywords[name] ?? [])];
          return words.some((w) => item.description.includes(w));
        });
        return match
          ? { key: item.key, categoryKey: match.key, confidence: 0.9 }
          : { key: item.key, categoryKey: null, confidence: 0 };
      });
    },
  };
}
