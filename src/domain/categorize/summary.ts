/** What one auto-categorize run did, for the message shown to the user. */
export type RunSummary = {
  /** Uncategorized rows looked at in this run. */
  considered: number;
  /** Rows that got a category. */
  categorized: number;
  failedBatches: number;
  /** True when the run hit its row cap and more remain. */
  moreRemain: boolean;
};

export function summarizeRun(run: RunSummary): {
  error?: string;
  success?: string;
} {
  if (run.categorized === 0) {
    return run.failedBatches > 0
      ? { error: "Gemini is busy right now. Please try again in a minute." }
      : {
          success:
            "No confident matches. Those transactions stay uncategorized.",
        };
  }

  const noun = run.considered === 1 ? "transaction" : "transactions";
  const parts = [
    `Categorized ${run.categorized} of ${run.considered} ${noun}.`,
  ];
  if (run.failedBatches > 0) {
    parts.push("Gemini was busy for some; try again in a minute.");
  }
  if (run.moreRemain) parts.push("Run it again for the rest.");
  return { success: parts.join(" ") };
}
