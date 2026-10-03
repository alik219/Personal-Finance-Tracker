import { ChevronRight, Tags, UserRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS: {
  href?: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Profile",
    description: "Name, timezone and default currency. Coming soon.",
    icon: UserRound,
  },
  {
    href: "/settings/categories",
    title: "Categories",
    description: "Add, rename, recolor or hide your income and expense types.",
    icon: Tags,
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="py-0">
        <ul className="divide-y">
          {SECTIONS.map(({ href, title, description, icon: Icon }) => {
            const body = (
              <>
                <Icon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </>
            );
            return (
              <li key={title}>
                {href ? (
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                  >
                    {body}
                    <ChevronRight
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 opacity-70">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
