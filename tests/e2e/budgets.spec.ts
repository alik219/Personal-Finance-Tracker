import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./helpers/auth";
import { seedAccounts } from "./helpers/seed";
import { adminClient, createConfirmedUser } from "./helpers/users";

// Needs the local database: run `npm run db:start` first.
// New users' time zone is UTC, so "this month" is the current UTC month.

type User = Awaited<ReturnType<typeof createConfirmedUser>>;

const todayUtc = new Date().toISOString().slice(0, 10);
const thisMonth = todayUtc.slice(0, 7);
const lastMonth = (() => {
  const d = new Date(`${thisMonth}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
})();
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

const list = (page: Page) => page.getByRole("list", { name: "Budgets" });
const row = (page: Page, name: string) =>
  list(page).getByRole("listitem").filter({ hasText: name });

async function categoryIds(userId: string) {
  const { data, error } = await adminClient()
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);
  if (error) throw error;
  return Object.fromEntries(data.map((c) => [c.name, c.id as string]));
}

async function seedBudget(
  userId: string,
  categoryId: string,
  amountMinor: number,
  { month = thisMonth, currency = "USD" } = {},
) {
  const { error } = await adminClient()
    .from("budgets")
    .insert({
      user_id: userId,
      category_id: categoryId,
      currency,
      amount_minor: amountMinor,
      month: `${month}-01`,
    });
  if (error) throw error;
}

async function openAddBudget(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add budget" }).first().click();
  return page.getByRole("dialog", { name: "Add budget" });
}

let user: User;
let accounts: Record<string, string>;
let categories: Record<string, string>;

test.beforeEach(async ({ page }) => {
  user = await createConfirmedUser("budgets");
  accounts = await seedAccounts(user.id); // Checking (USD), Travel Wallet (EUR)
  categories = await categoryIds(user.id);
  await signInAs(page, user);
});

test("add, edit and delete a budget", async ({ page }) => {
  await page.goto("/budgets");
  await expect(
    page.getByText(`No budgets for ${monthLabel(thisMonth)}`),
  ).toBeVisible();

  const dialog = await openAddBudget(page);
  await dialog.getByLabel("Category").selectOption({ label: "Groceries" });
  await dialog.getByLabel("Currency").selectOption("USD");
  await dialog.getByLabel("Monthly limit").fill("300");
  await dialog.getByRole("button", { name: "Add budget" }).click();
  await expect(dialog).toBeHidden();
  await expect(row(page, "Groceries")).toContainText("$0.00 of $300.00");
  await expect(row(page, "Groceries")).toContainText("$300.00 left");

  await page.getByRole("button", { name: "Edit Groceries USD budget" }).click();
  const edit = page.getByRole("dialog", { name: "Edit Groceries budget" });
  await expect(edit.getByLabel("Monthly limit")).toHaveValue("300.00");
  await edit.getByLabel("Monthly limit").fill("250");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(edit).toBeHidden();
  await expect(row(page, "Groceries")).toContainText("$250.00 left");

  await page
    .getByRole("button", { name: "Delete Groceries USD budget" })
    .click();
  await page.getByRole("button", { name: "Delete budget" }).click();
  await expect(
    page.getByText(`No budgets for ${monthLabel(thisMonth)}`),
  ).toBeVisible();
});

test("each currency has its own budget per category", async ({ page }) => {
  await seedBudget(user.id, categories.Groceries, 30000);
  await page.goto("/budgets");

  const dialog = await openAddBudget(page);
  const category = dialog.getByLabel("Category");
  await dialog.getByLabel("Currency").selectOption("USD");
  await expect(category.getByRole("option", { name: "Groceries" })).toHaveCount(
    0,
  );

  await dialog.getByLabel("Currency").selectOption("EUR");
  await category.selectOption({ label: "Groceries" });
  await dialog.getByLabel("Monthly limit").fill("50");
  await dialog.getByRole("button", { name: "Add budget" }).click();
  await expect(dialog).toBeHidden();

  await expect(row(page, "Groceries")).toHaveCount(2);
  await expect(list(page)).toContainText("€50.00");
  const totals = page.getByRole("region", { name: "Totals by currency" });
  await expect(totals).toContainText("Spent in EUR");
  await expect(totals).toContainText("Spent in USD");
});

test("spending past 80% warns here and on every page; past 100% is over", async ({
  page,
}) => {
  await seedBudget(user.id, categories.Groceries, 10000); // $100
  const tx = (amount_minor: number, extra: Record<string, unknown> = {}) => ({
    user_id: user.id,
    account_id: accounts.Checking,
    date: todayUtc,
    amount_minor,
    description: "Groceries run",
    category_id: categories.Groceries,
    category_source: "manual",
    ...extra,
  });
  const { error } = await adminClient()
    .from("transactions")
    .insert([
      tx(-8500),
      // Neither counts: another month, and another currency.
      tx(-5000, { date: `${lastMonth}-15` }),
      tx(-2000, { account_id: accounts["Travel Wallet"] }),
    ]);
  if (error) throw error;

  await page.goto("/dashboard");
  const banner = page.getByRole("status", { name: "Budget alert" });
  await expect(banner).toContainText("Groceries is close to the limit.");

  await banner.getByRole("link", { name: "View budgets" }).click();
  await expect(page).toHaveURL("/budgets");
  await expect(row(page, "Groceries")).toContainText("85% used · $15.00 left");
  await expect(row(page, "Groceries").getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "85",
  );

  // Push it over with a quick-add expense.
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Quick add transaction" }).click();
  const sheet = page.getByRole("dialog", { name: "Add a transaction" });
  await sheet.getByLabel("Amount").fill("20");
  await sheet.getByLabel("Description").fill("More groceries");
  await sheet.getByLabel("Account").selectOption(accounts.Checking);
  await sheet.getByLabel("Category").selectOption({ label: "Groceries" });
  await sheet.getByRole("button", { name: "Add transaction" }).click();
  await expect(sheet).toBeHidden();

  await expect(row(page, "Groceries")).toContainText("$5.00 over");
  await expect(banner).toContainText("Groceries is over budget.");
});

test("copy last month's budgets and move between months", async ({ page }) => {
  await seedBudget(user.id, categories.Groceries, 30000, { month: lastMonth });
  await seedBudget(user.id, categories["Dining out"], 10000, {
    month: lastMonth,
  });
  // Already set this month: copying must keep it.
  await seedBudget(user.id, categories["Dining out"], 15000);

  await page.goto("/budgets");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: `Copy from ${monthLabel(lastMonth)}` })
    .click();
  await expect(
    page.getByText(`Copied 1 budget from ${monthLabel(lastMonth)}.`),
  ).toBeVisible();
  await expect(row(page, "Groceries")).toContainText("of $300.00");
  await expect(row(page, "Dining out")).toContainText("of $150.00");

  const months = page.getByRole("navigation", { name: "Month" });
  await months
    .getByRole("link", { name: `Previous month, ${monthLabel(lastMonth)}` })
    .click();
  await expect(page).toHaveURL(`/budgets?month=${lastMonth}`);
  await expect(months).toContainText(monthLabel(lastMonth));
  await expect(row(page, "Dining out")).toContainText("of $100.00");

  await months.getByRole("link", { name: "This month" }).click();
  await expect(page).toHaveURL("/budgets");
  await expect(months).toContainText(monthLabel(thisMonth));
});
