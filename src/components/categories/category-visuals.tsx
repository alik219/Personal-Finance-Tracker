import {
  Baby,
  Book,
  Briefcase,
  Bus,
  Car,
  Clapperboard,
  Coffee,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Utensils,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type {
  CategoryColor,
  CategoryIcon,
} from "@/domain/categories/categories";
import { cn } from "@/lib/utils";

export const CATEGORY_ICON_COMPONENTS: Record<CategoryIcon, LucideIcon> = {
  tag: Tag,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  coffee: Coffee,
  car: Car,
  bus: Bus,
  fuel: Fuel,
  plane: Plane,
  house: House,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  sparkles: Sparkles,
  clapperboard: Clapperboard,
  music: Music,
  "gamepad-2": Gamepad2,
  "graduation-cap": GraduationCap,
  book: Book,
  baby: Baby,
  "paw-print": PawPrint,
  gift: Gift,
  heart: Heart,
  wrench: Wrench,
  receipt: Receipt,
  landmark: Landmark,
  "piggy-bank": PiggyBank,
  briefcase: Briefcase,
  laptop: Laptop,
  "trending-up": TrendingUp,
  "hand-coins": HandCoins,
};

// Full class names so Tailwind can find them at build time.
/** Soft tinted background + readable foreground, for icon chips. */
export const CATEGORY_TINT: Record<CategoryColor, string> = {
  slate: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  lime: "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  green: "bg-green-500/15 text-green-700 dark:text-green-300",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  indigo: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  pink: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
};

/** Solid swatch, for the color picker. */
export const CATEGORY_SWATCH: Record<CategoryColor, string> = {
  slate: "bg-slate-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  pink: "bg-pink-500",
};

/** "gamepad-2" -> "Gamepad 2", "teal" -> "Teal". */
export function keyLabel(key: string): string {
  const words = key.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The category's icon in a tinted chip. */
export function CategoryChip({
  color,
  icon,
  className,
}: {
  color: CategoryColor;
  icon: CategoryIcon;
  className?: string;
}) {
  const Icon = CATEGORY_ICON_COMPONENTS[icon];
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        CATEGORY_TINT[color],
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
