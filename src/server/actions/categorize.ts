"use server";

import { revalidatePath } from "next/cache";

import { categorizeTransactions } from "@/domain/categorize/pipeline";
import { summarizeRun } from "@/domain/categorize/summary";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form";
import { getCategorizationProvider } from "@/server/ai";
import { listCategories } from "@/server/repos/categories";
import {
  applyAiCategories,
  listUncategorized,
} from "@/server/repos/transactions";

/** Rows per run: about 10 Gemini calls at most, well inside a request. */
const MAX_ROWS = 500;

/** Suggests categories for the user's uncategorized transactions. */
export async function autoCategorize(): Promise<FormState> {
  await requireUser();
  const provider = getCategorizationProvider();
  if (!provider) return { error: "Auto-categorize isn't set up yet." };

  const supabase = await createClient();
  const rows = await listUncategorized(supabase, MAX_ROWS);
  if (rows.length === 0) {
    return { success: "Everything is already categorized." };
  }

  // Counted only when there's work, so an empty click is free.
  const { data: allowed, error } = await supabase.rpc("claim_ai_run");
  if (error) {
    return { error: "Couldn't start auto-categorize. Please try again." };
  }
  if (!allowed) {
    return {
      error:
        "You've auto-categorized 10 times in the last hour. Please try again later.",
    };
  }

  try {
    const categories = await listCategories(supabase);
    const result = await categorizeTransactions(rows, categories, provider);
    const categorized = await applyAiCategories(supabase, result.updates);
    revalidatePath("/", "layout");
    return summarizeRun({
      considered: rows.length,
      categorized,
      failedBatches: result.failedBatches,
      moreRemain: rows.length === MAX_ROWS,
    });
  } catch {
    return { error: "Couldn't save the categories. Please try again." };
  }
}
