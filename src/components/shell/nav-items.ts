import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the phone bottom bar; the rest live under "More". */
  primaryOnMobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    primaryOnMobile: true,
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    primaryOnMobile: true,
  },
  { href: "/accounts", label: "Accounts", icon: Wallet, primaryOnMobile: true },
  {
    href: "/budgets",
    label: "Budgets",
    icon: PiggyBank,
    primaryOnMobile: true,
  },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** A nav item is active on its own page and on any page nested under it. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
