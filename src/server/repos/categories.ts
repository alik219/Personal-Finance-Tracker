import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  colorOrDefault,
  iconOrDefault,
  type CategoryColor,
  type CategoryIcon,
  type CategoryKind,
} from "@/domain/categories/categories";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: CategoryColor;
  icon: CategoryIcon;
  hidden: boolean;
};

export async function listCategories(supabase: Client): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, kind, color, icon, hidden")
    .order("name");
  if (error) throw error;
  return data.map((c) => ({
    ...c,
    color: colorOrDefault(c.color),
    icon: iconOrDefault(c.icon),
  }));
}

export async function getCategory(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type CategoryInput = {
  name: string;
  color: CategoryColor;
  icon: CategoryIcon;
};

export function insertCategory(
  supabase: Client,
  input: CategoryInput & { kind: CategoryKind },
) {
  return supabase.from("categories").insert(input);
}

export function updateCategory(
  supabase: Client,
  id: string,
  input: Partial<CategoryInput> & { hidden?: boolean },
) {
  return supabase.from("categories").update(input).eq("id", id);
}

export function deleteCategory(supabase: Client, id: string) {
  return supabase.from("categories").delete().eq("id", id);
}
