import type { Database } from "@/lib/supabase/types";

export type CategorySource = Database["public"]["Enums"]["category_source"];

/**
 * Where a saved category came from. A category the user picks is 'manual';
 * an unchanged one keeps its source, so an AI pick stays 'ai' when the user
 * only edits the amount.
 */
export function nextCategorySource(
  categoryId: string | null,
  existing?: { categoryId: string | null; source: CategorySource },
): CategorySource {
  if (categoryId === null) return "none";
  if (existing && existing.categoryId === categoryId) return existing.source;
  return "manual";
}
