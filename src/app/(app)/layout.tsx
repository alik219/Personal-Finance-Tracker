import Link from "next/link";

import { BottomNav } from "@/components/shell/bottom-nav";
import { QuickAddFab } from "@/components/shell/quick-add-fab";
import { Sidebar } from "@/components/shell/sidebar";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const userMenu = <UserMenu email={user.email} />;

  return (
    <div className="flex flex-1">
      <Sidebar footer={userMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone top bar; desktop uses the sidebar instead. */}
        <header className="flex items-center justify-between border-b px-4 py-2 md:hidden">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Personal Finance Tracker
          </Link>
          <ThemeToggle />
        </header>
        {/* Bottom padding keeps content clear of the phone tab bar and FAB. */}
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 pb-28 md:p-8">
          {children}
        </main>
      </div>
      <BottomNav footer={userMenu} />
      <QuickAddFab />
    </div>
  );
}
