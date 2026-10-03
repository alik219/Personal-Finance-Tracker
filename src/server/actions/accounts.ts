"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  parseCreateAccount,
  parseUpdateAccount,
} from "@/lib/validation/accounts";
import { fieldErrorsOf, type FormState } from "@/lib/validation/form";
import * as accounts from "@/server/repos/accounts";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

function formValues(formData: FormData) {
  return {
    name: text(formData, "name"),
    type: text(formData, "type"),
    currency: text(formData, "currency"),
    openingBalance: text(formData, "openingBalance"),
  };
}

function saveFailed(error: PostgrestError, values: Record<string, string>) {
  if (error.code === "23505") {
    return {
      fieldErrors: { name: ["You already have an account with this name."] },
      values,
    };
  }
  return { error: "Couldn't save the account. Please try again.", values };
}

export async function createAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const values = formValues(formData);
  const parsed = parseCreateAccount(values);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await accounts.insertAccount(supabase, parsed.data);
  if (error) return saveFailed(error, values);

  revalidatePath("/accounts");
  return { success: `Added ${parsed.data.name}.` };
}

export async function updateAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const values = formValues(formData);
  const supabase = await createClient();

  // RLS limits this to the user's own accounts; missing means not theirs.
  const existing = await accounts.getAccount(supabase, text(formData, "id"));
  if (!existing) return { error: "That account no longer exists.", values };

  const parsed = parseUpdateAccount(values, existing.currency);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const { error } = await accounts.updateAccount(
    supabase,
    existing.id,
    parsed.data,
  );
  if (error) return saveFailed(error, values);

  revalidatePath("/accounts");
  return { success: `Saved ${parsed.data.name}.` };
}

export async function deleteAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const existing = await accounts.getAccount(supabase, text(formData, "id"));
  if (!existing) return { error: "That account no longer exists." };

  // The dialog asks the user to type the name; check it here too.
  if (text(formData, "confirmName").trim() !== existing.name) {
    return {
      fieldErrors: {
        confirmName: ["Type the account name exactly to confirm."],
      },
    };
  }

  const { error } = await accounts.deleteAccount(supabase, existing.id);
  if (error) return { error: "Couldn't delete the account. Please try again." };

  revalidatePath("/accounts");
  return { success: `Deleted ${existing.name}.` };
}
