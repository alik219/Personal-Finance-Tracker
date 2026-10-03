import type { Database } from "@/lib/supabase/types";

export type CategoryKind = Database["public"]["Enums"]["category_kind"];

export const CATEGORY_KINDS: { value: CategoryKind; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

export function isCategoryKind(value: string): value is CategoryKind {
  return CATEGORY_KINDS.some((k) => k.value === value);
}

/** Palette keys stored in categories.color. The UI maps each to a swatch. */
export const CATEGORY_COLORS = [
  "slate",
  "red",
  "orange",
  "amber",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "pink",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

/** Icon keys stored in categories.icon (lucide names). */
export const CATEGORY_ICONS = [
  "tag",
  "shopping-cart",
  "utensils",
  "coffee",
  "car",
  "bus",
  "fuel",
  "plane",
  "house",
  "zap",
  "wifi",
  "smartphone",
  "shopping-bag",
  "shirt",
  "heart-pulse",
  "dumbbell",
  "sparkles",
  "clapperboard",
  "music",
  "gamepad-2",
  "graduation-cap",
  "book",
  "baby",
  "paw-print",
  "gift",
  "heart",
  "wrench",
  "receipt",
  "landmark",
  "piggy-bank",
  "briefcase",
  "laptop",
  "trending-up",
  "hand-coins",
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const DEFAULT_COLOR: CategoryColor = "slate";
export const DEFAULT_ICON: CategoryIcon = "tag";

export function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

export function isCategoryIcon(value: string): value is CategoryIcon {
  return (CATEGORY_ICONS as readonly string[]).includes(value);
}

/** Stored values the app no longer knows (e.g. a removed icon) fall back. */
export const colorOrDefault = (value: string): CategoryColor =>
  isCategoryColor(value) ? value : DEFAULT_COLOR;
export const iconOrDefault = (value: string): CategoryIcon =>
  isCategoryIcon(value) ? value : DEFAULT_ICON;
