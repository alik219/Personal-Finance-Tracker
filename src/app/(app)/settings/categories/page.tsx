import type { Metadata } from "next";

import { CategoriesView } from "@/components/categories/categories-view";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "@/server/repos/categories";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireUser();
  const supabase = await createClient();
  return <CategoriesView categories={await listCategories(supabase)} />;
}
