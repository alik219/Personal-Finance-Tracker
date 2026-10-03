import { z } from "zod";

import {
  isCategoryColor,
  isCategoryIcon,
  isCategoryKind,
} from "@/domain/categories/categories";

const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(40, "Use at most 40 characters.");

const kind = z.string().refine(isCategoryKind, "Choose income or expense.");
const color = z.string().refine(isCategoryColor, "Choose a color.");
const icon = z.string().refine(isCategoryIcon, "Choose an icon.");

export function parseCreateCategory(input: Record<string, string>) {
  return z.object({ name, kind, color, icon }).safeParse(input);
}

/** Kind can't change after creation, so updates don't take it. */
export function parseUpdateCategory(input: Record<string, string>) {
  return z.object({ name, color, icon }).safeParse(input);
}
