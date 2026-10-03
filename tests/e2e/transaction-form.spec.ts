import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./helpers/auth";
import { seedAccounts } from "./helpers/seed";
import { adminClient, createConfirmedUser } from "./helpers/users";

// Needs the local database: run `npm run db:start` first.

type User = Awaited<ReturnType<typeof createConfirmedUser>>;

async function categoryId(userId: string, name: string) {
  const { data, error } = await adminClient()
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .single();
  if (error) throw error;
  return data.id as string;
}

async function sourceOf(userId: string, description: string) {
  const { data, error } = await adminClient()
    .from("transactions")
    .select("category_source")
    .eq("user_id", userId)
    .eq("description", description)
    .single();
  if (error) throw error;
  return data.category_source as string;
}

async function openQuickAdd(page: Page) {
  // Clicking before hydration does nothing, so wait for the page to settle.
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Quick add transaction" }).click();
  return page.getByRole("dialog", { name: "Add a transaction" });
}

const list = (page: Page) => page.getByRole("list", { name: "Transactions" });
const row = (page: Page, description: string) =>
  list(page).getByRole("listitem").filter({ hasText: description });

test.describe("with accounts", () => {
  let user: User;
  let accounts: Record<string, string>;

  test.beforeEach(async ({ page }) => {
    user = await createConfirmedUser("tx-form");
    accounts = await seedAccounts(user.id); // Checking (USD $1,000), Travel Wallet (EUR)
    await signInAs(page, user);
  });

  test("quick add an expense from any page", async ({ page }) => {
    await page.goto("/budgets");
    const sheet = await openQuickAdd(page);
    await expect(sheet.getByLabel("Date")).not.toHaveValue("");
    await expect(sheet.getByLabel("Account")).toHaveValue(accounts.Checking);

    await sheet.getByLabel("Amount").fill("12.50");
    await sheet.getByLabel("Description").fill("Flat white");
    await sheet.getByLabel("Category").selectOption({ label: "Dining out" });
    await sheet.getByRole("button", { name: "Add transaction" }).click();
    await expect(sheet).toBeHidden();

    await page.goto("/transactions");
    await expect(row(page, "Flat white")).toContainText("-$12.50");
    await expect(row(page, "Flat white")).toContainText("Dining out");
    expect(await sourceOf(user.id, "Flat white")).toBe("manual");

    await page.goto("/accounts");
    await expect(
      page.getByRole("listitem").filter({ hasText: "Checking" }),
    ).toContainText("$987.50");
  });

  test("income offers income categories and stays positive", async ({
    page,
  }) => {
    await page.goto("/transactions");
    const sheet = await openQuickAdd(page);
    const category = sheet.getByLabel("Category");

    await category.selectOption({ label: "Groceries" });
    await sheet.getByRole("radio", { name: "Income" }).check();
    // The expense category no longer fits, so it's cleared.
    await expect(category).toHaveValue("");
    await expect(category.getByRole("option", { name: "Salary" })).toHaveCount(
      1,
    );
    await expect(
      category.getByRole("option", { name: "Groceries" }),
    ).toHaveCount(0);

    await sheet.getByLabel("Amount").fill("2,500");
    await sheet.getByLabel("Description").fill("Paycheck");
    await category.selectOption({ label: "Salary" });
    await sheet.getByRole("button", { name: "Add transaction" }).click();
    await expect(sheet).toBeHidden();

    await expect(row(page, "Paycheck")).toContainText("$2,500.00");
    await expect(row(page, "Paycheck")).not.toContainText("-$");
  });

  test("validation keeps the form open; decimals follow the account currency", async ({
    page,
  }) => {
    await adminClient().from("accounts").insert({
      user_id: user.id,
      name: "Yen Cash",
      type: "cash",
      currency: "JPY",
    });
    await page.goto("/transactions");
    const sheet = await openQuickAdd(page);

    await sheet.getByLabel("Amount").fill("0");
    await sheet.getByLabel("Description").fill("Nothing");
    await sheet.getByRole("button", { name: "Add transaction" }).click();
    await expect(sheet.getByText(/Enter an amount above zero/)).toBeVisible();
    await expect(sheet.getByLabel("Description")).toHaveValue("Nothing");

    await sheet.getByLabel("Account").selectOption({ label: "Yen Cash (JPY)" });
    await sheet.getByLabel("Amount").fill("10.5");
    await sheet.getByRole("button", { name: "Add transaction" }).click();
    await expect(
      sheet.getByText("Too many decimal places for this currency."),
    ).toBeVisible();

    await sheet.getByLabel("Amount").fill("1,500");
    await sheet.getByRole("button", { name: "Add transaction" }).click();
    await expect(sheet).toBeHidden();
    await expect(row(page, "Nothing")).toContainText("-¥1,500");
  });

  test("edit keeps an AI pick until the category changes", async ({ page }) => {
    await adminClient()
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: accounts.Checking,
        date: "2026-03-05",
        amount_minor: -4200,
        description: "Uber trip",
        category_id: await categoryId(user.id, "Transport"),
        category_source: "ai",
      });
    await page.goto("/transactions");
    await expect(
      row(page, "Uber trip").getByLabel("Categorized by AI"),
    ).toBeVisible();

    await page.getByRole("button", { name: /^Edit Uber trip/ }).click();
    const dialog = page.getByRole("dialog", { name: "Edit transaction" });
    await expect(dialog.getByLabel("Amount")).toHaveValue("42.00");
    await expect(dialog.getByRole("radio", { name: "Expense" })).toBeChecked();
    await expect(dialog.getByText(/Picked by AI/)).toBeVisible();

    await dialog.getByLabel("Amount").fill("45");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).toBeHidden();
    await expect(row(page, "Uber trip")).toContainText("-$45.00");
    expect(await sourceOf(user.id, "Uber trip")).toBe("ai");

    await page.getByRole("button", { name: /^Edit Uber trip/ }).click();
    await dialog.getByLabel("Category").selectOption({ label: "Travel" });
    await dialog.getByLabel("Description").fill("Airport taxi");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).toBeHidden();
    await expect(row(page, "Airport taxi")).toContainText("Travel");
    await expect(
      row(page, "Airport taxi").getByLabel("Categorized by AI"),
    ).toHaveCount(0);
    expect(await sourceOf(user.id, "Airport taxi")).toBe("manual");
  });

  test("delete asks for confirmation", async ({ page }) => {
    await adminClient().from("transactions").insert({
      user_id: user.id,
      account_id: accounts.Checking,
      date: "2026-03-05",
      amount_minor: -999,
      description: "Mistake",
    });
    await page.goto("/transactions");

    await page.getByRole("button", { name: /^Edit Mistake/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(dialog).toContainText("Delete this transaction?");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toContainText("Edit transaction");

    await dialog.getByRole("button", { name: "Delete" }).click();
    await dialog.getByRole("button", { name: "Delete transaction" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("No transactions yet")).toBeVisible();
  });
});

test("quick add without accounts points to the accounts page", async ({
  page,
}) => {
  await signInAs(page, await createConfirmedUser("tx-form-empty"));
  const sheet = await openQuickAdd(page);
  await sheet.getByRole("link", { name: "Go to accounts" }).click();
  await expect(page).toHaveURL("/accounts");
  await expect(sheet).toBeHidden();
});
