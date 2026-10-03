"use client";

import {
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { MoneyText } from "@/components/common/money-text";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  accountTypeLabel,
  type AccountType,
} from "@/domain/accounts/account-types";
import type { CurrencyOption } from "@/domain/money/currencies";
import { sumByCurrency } from "@/domain/money/group";
import { cn } from "@/lib/utils";

import { AccountFormDialog, type EditableAccount } from "./account-form-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";

export type AccountRow = EditableAccount & { balanceMinor: bigint };

const ICONS: Record<AccountType, LucideIcon> = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
  loan: HandCoins,
  other: Wallet,
};

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; account: AccountRow }
  | { kind: "delete"; account: AccountRow }
  | null;

export function AccountsView({
  accounts,
  currencies,
  defaultCurrency,
}: {
  accounts: AccountRow[];
  currencies: CurrencyOption[];
  defaultCurrency: string;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = (open: boolean) => !open && setDialog(null);

  const totals = Object.entries(
    sumByCurrency(
      accounts.map((a) => ({
        currency: a.currency,
        amountMinor: a.balanceMinor,
      })),
    ),
  ).sort(([a], [b]) => a.localeCompare(b));

  const addButton = (
    <Button onClick={() => setDialog({ kind: "create" })}>
      <Plus aria-hidden />
      Add account
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Your bank accounts, cards and cash, with their balances."
        actions={accounts.length > 0 && addButton}
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your first account to start tracking balances and transactions."
          action={addButton}
        />
      ) : (
        <>
          <section
            aria-label="Totals by currency"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {totals.map(([currency, total]) => (
              <Card key={currency} size="sm">
                <CardContent className="grid gap-1">
                  <p className="text-sm text-muted-foreground">
                    Total in {currency}
                  </p>
                  <MoneyText
                    minor={total}
                    currency={currency}
                    className="text-2xl font-semibold"
                  />
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="py-0">
            <ul aria-label="Accounts" className="divide-y">
              {accounts.map((account) => {
                const Icon = ICONS[account.type];
                return (
                  <li
                    key={account.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Icon
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {accountTypeLabel(account.type)} · {account.currency}
                      </p>
                    </div>
                    <MoneyText
                      minor={account.balanceMinor}
                      currency={account.currency}
                      className={cn(
                        "font-medium",
                        account.balanceMinor < 0n && "text-destructive",
                      )}
                    />
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${account.name}`}
                        onClick={() => setDialog({ kind: "edit", account })}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${account.name}`}
                        onClick={() => setDialog({ kind: "delete", account })}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <AccountFormDialog
        open={dialog?.kind === "create" || dialog?.kind === "edit"}
        onOpenChange={close}
        account={dialog?.kind === "edit" ? dialog.account : undefined}
        currencies={currencies}
        defaultCurrency={defaultCurrency}
      />
      {dialog?.kind === "delete" && (
        <DeleteAccountDialog
          open
          onOpenChange={close}
          account={dialog.account}
        />
      )}
    </>
  );
}
