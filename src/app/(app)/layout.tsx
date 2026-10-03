import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/server/actions/auth";

// Minimal signed-in frame; the full responsive shell arrives in task 9.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Personal Finance Tracker
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.email}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col p-4">{children}</main>
    </div>
  );
}
