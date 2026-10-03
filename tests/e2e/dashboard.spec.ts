import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./helpers/auth";
import { seedAccounts } from "./helpers/seed";
import { adminClient, createConfirmedUser } from "./helpers/users";

// Needs the local database: run `npm run db:start` first.
// New users' time zone is UTC, so "this month" is the current UTC month.

const todayUtc = new Date().toISOString().slice(0, 10);
const thisMonth = todayUtc.slice(0, 7);
const lastMonth = (() => {
  const d = new Date(`${thisMonth}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
})();
const label = (month: string, style: "long" | "full" = "full") =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    ...(style === "full" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

/**
 * USD this month: income $3,000.00; spending $1,200 rent + $150 groceries +
 * $20 uncategorized = $1,370.00. Last month spending $1,300.00 (+5%).
 * EUR this month: €45.00 groceries.
 */
async function seedDashboard(userId: string) {
  const db = adminClient();
  const accounts = await seedAccounts(userId);
  const { data: cats } = await db
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);
  const cat = Object.fromEntries(cats!.map((c) => [c.name, c.id as string]));

  const tx = (
    date: string,
    amount_minor: number,
    description: string,
    category: string | null,
    account = accounts.Checking,
  ) => ({
    user_id: userId,
    account_id: account,
    date,
    amount_minor,
    description,
    category_id: category && cat[category],
    category_source: category ? "manual" : "none",
  });

  const { error } = await db
    .from("transactions")
    .insert([
      tx(todayUtc, 300000, "Salary", "Salary"),
      tx(todayUtc, -120000, "Rent", "Housing"),
      tx(todayUtc, -8550, "Supermarket", "Groceries"),
      tx(todayUtc, -6450, "Farmers market", "Groceries"),
      tx(todayUtc, -2000, "Cash withdrawal", null),
      tx(`${lastMonth}-15`, 300000, "Salary", "Salary"),
      tx(`${lastMonth}-15`, -120000, "Rent", "Housing"),
      tx(`${lastMonth}-15`, -10000, "Supermarket", "Groceries"),
      tx(
        todayUtc,
        -4500,
        "Boulangerie",
        "Groceries",
        accounts["Travel Wallet"],
      ),
    ]);
  if (error) throw error;

  const { error: budgetError } = await db.from("budgets").insert({
    user_id: userId,
    category_id: cat.Groceries,
    currency: "USD",
    amount_minor: 20000,
    month: `${thisMonth}-01`,
  });
  if (budgetError) throw budgetError;
}

const totals = (page: Page) =>
  page.getByRole("region", { name: "Month totals" });
const byCategory = (page: Page) =>
  page.getByRole("region", { name: "Spending by category" });
const trendRegion = (page: Page) =>
  page.getByRole("region", { name: "Income and spending trend" });

async function openTable(region: ReturnType<typeof byCategory>) {
  await region.getByText("View as table").click();
  return region.getByRole("table");
}

test.describe("with transactions", () => {
  test.beforeEach(async ({ page }) => {
    const user = await createConfirmedUser("dashboard");
    await seedDashboard(user.id);
    await signInAs(page, user);
  });

  test("shows the month's totals, categories, budgets and trend", async ({
    page,
  }) => {
    await expect(totals(page)).toContainText("Income$3,000.00");
    await expect(totals(page)).toContainText("Spending$1,370.00");
    await expect(totals(page)).toContainText("Net$1,630.00");
    await expect(totals(page)).toContainText(
      `+5% vs ${label(lastMonth, "long")}`,
    );
    await expect(totals(page)).toContainText(
      `0% vs ${label(lastMonth, "long")}`,
    );

    const table = await openTable(byCategory(page));
    const rows = table.getByRole("row");
    await expect(rows.nth(1)).toHaveText("Housing$1,200.00");
    await expect(rows.nth(2)).toHaveText("Groceries$150.00");
    await expect(rows.nth(3)).toHaveText("Uncategorized$20.00");
    // The chart draws one bar per category.
    await expect(
      byCategory(page).locator(".recharts-bar-rectangle"),
    ).toHaveCount(3);

    const budgets = page.getByRole("list", { name: "Budgets this month" });
    await expect(budgets).toContainText("Groceries");
    await expect(budgets).toContainText("$150.00 of $200.00");

    const trend = await openTable(trendRegion(page));
    await expect(trend.getByRole("row")).toHaveCount(7); // header + 6 months
    await expect(trend.getByRole("row", { name: label(thisMonth) })).toHaveText(
      `${label(thisMonth)}$3,000.00$1,370.00`,
    );
    await expect(trend.getByRole("row", { name: label(lastMonth) })).toHaveText(
      `${label(lastMonth)}$3,000.00$1,300.00`,
    );
  });

  test("switches currency without mixing totals", async ({ page }) => {
    const tabs = page.getByRole("navigation", { name: "Currency" });
    await expect(tabs.getByRole("link", { name: "USD" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await tabs.getByRole("link", { name: "EUR" }).click();
    await expect(page).toHaveURL(/currency=EUR/);
    await expect(totals(page)).toContainText("Income€0.00");
    await expect(totals(page)).toContainText("Spending€45.00");
    // No EUR budgets.
    await expect(page.getByText("No budgets this month.")).toBeVisible();
  });

  test("moves to last month and keeps the currency", async ({ page }) => {
    await page
      .getByRole("navigation", { name: "Currency" })
      .getByRole("link", { name: "USD" })
      .click();
    await page
      .getByRole("link", { name: `Previous month, ${label(lastMonth)}` })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`month=${lastMonth}.*currency=USD`),
    );
    await expect(totals(page)).toContainText("Spending$1,300.00");
  });
});

test("a new user is pointed to accounts", async ({ page }) => {
  await signInAs(page, await createConfirmedUser("dashboard-new"));
  await expect(page.getByText("Start by adding an account")).toBeVisible();
  await page.getByRole("link", { name: "Go to accounts" }).click();
  await expect(page).toHaveURL("/accounts");
});

test("a month without spending shows empty states", async ({ page }) => {
  const user = await createConfirmedUser("dashboard-empty");
  await seedAccounts(user.id);
  await signInAs(page, user);

  await expect(totals(page)).toContainText("Spending$0.00");
  await expect(
    page.getByText(`No spending in ${label(thisMonth)}`),
  ).toBeVisible();
  await expect(page.getByText("No budgets this month.")).toBeVisible();
});
