"use client";

import { Sparkles } from "lucide-react";
import { useActionState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/validation/form";
import { autoCategorize } from "@/server/actions/categorize";

const count = new Intl.NumberFormat("en-US");

export function AutoCategorize({ uncategorized }: { uncategorized: number }) {
  const [state, formAction, pending] = useActionState(
    autoCategorize,
    {} as FormState,
  );

  return (
    <section
      aria-label="Auto-categorize"
      className="grid gap-3 rounded-xl border p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <p className="text-sm font-medium">
            {uncategorized === 0
              ? "Everything is categorized."
              : `${count.format(uncategorized)} uncategorized ${
                  uncategorized === 1 ? "transaction" : "transactions"
                }`}
          </p>
          <p className="text-xs text-muted-foreground">
            Sends cleaned-up descriptions (no amounts, accounts or names) to
            Google Gemini, which may use them to improve its products.
          </p>
        </div>
        <form action={formAction}>
          <Button
            type="submit"
            variant="outline"
            disabled={pending || uncategorized === 0}
          >
            <Sparkles aria-hidden />
            {pending ? "Categorizing…" : "Auto-categorize"}
          </Button>
        </form>
      </div>
      <FormMessage error={state.error} success={state.success} />
    </section>
  );
}
