"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { isActivePath, NAV_ITEMS } from "./nav-items";

const primary = NAV_ITEMS.filter((item) => item.primaryOnMobile);
const secondary = NAV_ITEMS.filter((item) => !item.primaryOnMobile);

const tabClass =
  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors";

/** Phone navigation (below md): four tabs plus a "More" sheet. */
export function BottomNav({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = secondary.some(({ href }) => isActivePath(pathname, href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  tabClass,
                  active && "font-medium text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              tabClass,
              moreActive && "font-medium text-foreground",
            )}
          >
            <Ellipsis className="size-5" aria-hidden />
            More
          </button>
        </li>
      </ul>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <ul className="grid gap-1 px-4">
            {secondary.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={
                    isActivePath(pathname, href) ? "page" : undefined
                  }
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-muted"
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t p-4">{footer}</div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
