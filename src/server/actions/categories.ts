"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  parseCreateCategory,
  parseUpdateCategory,
} from "@/lib/validation/categories";
import { fieldErrorsOf, type FormState } from "@/lib/validation/form";
import * as categories from "@/server/repos/categories";

const PATH = "/settings/categories";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

function formValues(formData: FormData) {
  return {
    name: text(formData, "name"),
    kind: text(formData, "kind"),
    color: text(formData, "color"),
    icon: text(formData, "icon"),
  };
}

function saveFailed(error: PostgrestError, values: Record<string, string>) {
  if (error.code === "23505") {
    return {
      fieldErrors: { name: ["You already have a category with this name."] },
      values,
    };
  }
  return { error: "Couldn't save the category. Please try again.", values };
}

export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const values = formValues(formData);
  const parsed = parseCreateCategory(values);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await categories.insertCategory(supabase, parsed.data);
  if (error) return saveFailed(error, values);

  revalidatePath(PATH);
  return { success: `Added ${parsed.data.name}.` };
}

export async function updateCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const values = formValues(formData);
  const parsed = parseUpdateCategory(values);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const supabase = await createClient();
  // RLS limits this to the user's own categories; missing means not theirs.
  const existing = await categories.getCategory(supabase, text(formData, "id"));
  if (!existing) return { error: "That category no longer exists.", values };

  const { error } = await categories.updateCategory(
    supabase,
    existing.id,
    parsed.data,
  );
  if (error) return saveFailed(error, values);

  revalidatePath(PATH);
  return { success: `Saved ${parsed.data.name}.` };
}

export async function setCategoryHidden(
  id: string,
  hidden: boolean,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await categories.updateCategory(supabase, id, { hidden });
  if (error) return { error: "Couldn't update the category." };

  revalidatePath(PATH);
  return { success: hidden ? "Category hidden." : "Category shown." };
}

export async function deleteCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const existing = await categories.getCategory(supabase, text(formData, "id"));
  if (!existing) return { error: "That category no longer exists." };

  const { error } = await categories.deleteCategory(supabase, existing.id);
  if (error)
    return { error: "Couldn't delete the category. Please try again." };

  revalidatePath(PATH);
  return { success: `Deleted ${existing.name}.` };
}
