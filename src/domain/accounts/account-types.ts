import type { Database } from "@/lib/supabase/types";

export type AccountType = Database["public"]["Enums"]["account_type"];

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit card" },
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
];

const LABELS = new Map(ACCOUNT_TYPES.map((t) => [t.value, t.label]));

export function accountTypeLabel(type: AccountType): string {
  return LABELS.get(type) ?? type;
}

export function isAccountType(value: string): value is AccountType {
  return LABELS.has(value as AccountType);
}
