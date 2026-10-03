import { expect, test, type Page } from "@playwright/test";

import { signInAs, signOut } from "./helpers/auth";
import { createConfirmedUser } from "./helpers/users";

// Needs the local database: run `npm run db:start` first.

async function addAccount(
  page: Page,
  {
    name,
    type,
    currency,
    balance,
  }: { name: string; type?: string; currency?: string; balance?: string },
) {
  await page.getByRole("button", { name: "Add account" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add account" });
  await dialog.getByLabel("Name").fill(name);
  if (type) await dialog.getByLabel("Type").selectOption({ label: type });
  if (currency) await dialog.getByLabel("Currency").selectOption(currency);
  if (balance !== undefined) {
    await dialog.getByLabel(/Opening balance/).fill(balance);
  }
  await dialog.getByRole("button", { name: "Add account" }).click();
  return dialog;
}

const accountList = (page: Page) =>
  page.getByRole("list", { name: "Accounts" });
const accountRow = (page: Page, name: string) =>
  accountList(page).getByRole("listitem").filter({ hasText: name });

test.beforeEach(async ({ page }) => {
  await signInAs(page, await createConfirmedUser("accounts"));
  await page.goto("/accounts");
});

test("add accounts in different currencies and see totals per currency", async ({
  page,
}) => {
  await expect(page.getByText("No accounts yet")).toBeVisible();

  await addAccount(page, { name: "Main Checking", balance: "1,234.50" });
  await expect(accountRow(page, "Main Checking")).toContainText("$1,234.50");
  await expect(accountRow(page, "Main Checking")).toContainText(
    "Checking · USD",
  );

  await addAccount(page, {
    name: "Visa",
    type: "Credit card",
    balance: "-200",
  });
  await expect(accountRow(page, "Visa")).toContainText("-$200.00");

  await addAccount(page, {
    name: "Yen Wallet",
    type: "Cash",
    currency: "JPY",
    balance: "5000",
  });
  await expect(accountRow(page, "Yen Wallet")).toContainText("¥5,000");

  // Currencies are totalled separately, never converted.
  const totals = page.getByRole("region", { name: "Totals by currency" });
  await expect(totals).toContainText("Total in USD");
  await expect(totals).toContainText("$1,034.50");
  await expect(totals).toContainText("Total in JPY");
  await expect(totals).toContainText("¥5,000");
});

test("form validation keeps the dialog open with helpful errors", async ({
  page,
}) => {
  const dialog = await addAccount(page, {
    name: "Cash",
    currency: "JPY",
    balance: "10.5",
  });
  await expect(
    dialog.getByText("Too many decimal places for this currency."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Name")).toHaveValue("Cash");

  await dialog.getByLabel(/Opening balance/).fill("10");
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(dialog).toBeHidden();

  // Same name again, different case.
  const again = await addAccount(page, { name: "cash" });
  await expect(
    again.getByText("You already have an account with this name."),
  ).toBeVisible();
});

test("edit an account; its currency is locked", async ({ page }) => {
  await addAccount(page, { name: "Savings", type: "Savings", balance: "100" });

  await page.getByRole("button", { name: "Edit Savings" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit account" });
  await expect(dialog.getByLabel("Currency")).toBeDisabled();
  await expect(dialog.getByLabel(/Opening balance/)).toHaveValue("100.00");

  await dialog.getByLabel("Name").fill("Rainy Day Fund");
  await dialog.getByLabel(/Opening balance/).fill("250.75");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();

  await expect(accountRow(page, "Rainy Day Fund")).toContainText("$250.75");
  await expect(accountRow(page, "Savings ·")).toHaveCount(1);
});

test("deleting requires typing the account name", async ({ page }) => {
  await addAccount(page, { name: "Old Card", type: "Credit card" });

  await page.getByRole("button", { name: "Delete Old Card" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete Old Card?" });
  const confirm = dialog.getByRole("button", { name: "Delete account" });

  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Type "Old Card" to confirm/).fill("Old Car");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Type "Old Card" to confirm/).fill("Old Card");
  await confirm.click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("No accounts yet")).toBeVisible();
});

test("accounts are private to each user", async ({ page }) => {
  await addAccount(page, { name: "Alice Private" });
  await expect(accountRow(page, "Alice Private")).toBeVisible();

  await signOut(page);
  await signInAs(page, await createConfirmedUser("accounts-other"));
  await page.goto("/accounts");

  await expect(page.getByText("No accounts yet")).toBeVisible();
  await expect(page.getByText("Alice Private")).toHaveCount(0);
});
