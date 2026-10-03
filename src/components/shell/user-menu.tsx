import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/server/actions/auth";

import { ThemeToggle } from "./theme-toggle";

/** Signed-in user's email, theme toggle and sign out. */
export function UserMenu({ email }: { email: string | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {email}
      </span>
      <ThemeToggle />
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
          <LogOut aria-hidden />
        </Button>
      </form>
    </div>
  );
}
