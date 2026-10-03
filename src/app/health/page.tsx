import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Health" };

export default async function HealthPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("health_check");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {error ? "Database unreachable" : "Database connected"}
      </h1>
      <p className="text-muted-foreground">
        {error ? error.message : `Server time: ${data}`}
      </p>
    </main>
  );
}
