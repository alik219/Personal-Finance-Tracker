import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Personal Finance Tracker
      </h1>
      <p className="text-muted-foreground">
        Accounts, spending and budgets in one place, with AI categorization.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className={buttonVariants()}>
          Sign up
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Log in
        </Link>
      </div>
    </main>
  );
}
