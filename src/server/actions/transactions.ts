"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { normalizeDescription } from "@/domain/text/normalize";
import { nextCategorySource } from "@/domain/transactions/category-source";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, type FormState } from "@/lib/validation/form";
import { isUuid, parseTransaction } from "@/lib/validation/transactions";
import * as accounts from "@/server/repos/accounts";
import * as transactions from "@/server/repos/transactions";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

function formValues(formData: FormData) {
  return {
    type: text(formData, "type"),
    amount: text(formData, "amount"),
    description: text(formData, "description"),
    date: text(formData, "date"),
    accountId: text(formData, "accountId"),
    categoryId: text(formData, "categoryId"),
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Validates the form; the account's currency decides the decimal places. */
async function parseForm(supabase: Supabase, values: Record<string, string>) {
  // RLS limits this to the user's own accounts; missing means not theirs.
  const account = isUuid(values.accountId)
    ? await accounts.getAccount(supabase, values.accountId)
    : null;
  if (!account) {
    return {
      ok: false as const,
      state: { fieldErrors: { accountId: ["Choose an account."] }, values },
    };
  }
  const parsed = parseTransaction(values, account.currency);
  if (!parsed.success) {
    return {
      ok: false as const,
      state: { fieldErrors: fieldErrorsOf(parsed.error), values },
    };
  }
  return { ok: true as const, accountId: account.id, data: parsed.data };
}

function saveFailed(error: PostgrestError, values: Record<string, string>) {
  // Composite FK: the category doesn't exist or isn't the user's.
  if (error.code === "23503") {
    return {
      fieldErrors: { categoryId: ["Choose one of your categories."] },
      values,
    };
  }
  return { error: "Couldn't save the transaction. Please try again.", values };
}

// Balances, the list and the quick-add form all read transactions.
const refresh = () => revalidatePath("/", "layout");

export async function createTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const values = formValues(formData);
  const supabase = await createClient();
  const form = await parseForm(supabase, values);
  if (!form.ok) return form.state;

  const { categoryId, description } = form.data;
  const { error } = await transactions.insertTransaction(supabase, {
    ...form.data,
    accountId: form.accountId,
    normalizedDescription: normalizeDescription(description),
    categorySource: nextCategorySource(categoryId),
  });
  if (error) return saveFailed(error, values);

  refresh();
  return { success: `Added ${description}.` };
}

export async function updateTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const values = formValues(formData);
  const supabase = await createClient();

  const id = text(formData, "id");
  const existing = isUuid(id)
    ? await transactions.getTransaction(supabase, id)
    : null;
  if (!existing) return { error: "That transaction no longer exists.", values };

  const form = await parseForm(supabase, values);
  if (!form.ok) return form.state;

  const { categoryId, description } = form.data;
  const { error } = await transactions.updateTransaction(
    supabase,
    existing.id,
    {
      ...form.data,
      accountId: form.accountId,
      normalizedDescription: normalizeDescription(description),
      categorySource: nextCategorySource(categoryId, {
        categoryId: existing.category_id,
        source: existing.category_source,
      }),
    },
  );
  if (error) return saveFailed(error, values);

  refresh();
  return { success: `Saved ${description}.` };
}

export async function deleteTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const id = text(formData, "id");
  const existing = isUuid(id)
    ? await transactions.getTransaction(supabase, id)
    : null;
  if (!existing) return { error: "That transaction no longer exists." };

  const { error } = await transactions.deleteTransaction(supabase, existing.id);
  if (error) {
    return { error: "Couldn't delete the transaction. Please try again." };
  }

  refresh();
  return { success: `Deleted ${existing.description}.` };
}
