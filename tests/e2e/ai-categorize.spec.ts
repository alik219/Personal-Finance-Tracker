import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./helpers/auth";
import { seedAccounts } from "./helpers/seed";
import { adminClient, createConfirmedUser } from "./helpers/users";

// Needs the local database: run `npm run db:start` first. The test server
// runs with AI_PROVIDER=fake (see playwright.config.ts): a keyword matcher,
// so nothing is sent to Gemini.

const list = (page: Page) => page.getByRole("list", { name: "Transactions" });
const row = (page: Page, description: string) =>
  list(page).getByRole("listitem").filter({ hasText: description });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Auto-categorize" });

test("auto-categorize fills in uncategorized rows and leaves manual ones", async ({
  page,
}) => {
  const user = await createConfirmedUser("ai");
  const accounts = await seedAccounts(user.id);
  const db = adminClient();
  const { data: travel } = await db
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Travel")
    .single();

  // normalized_description is left empty on purpose: the app derives it.
  const base = {
    user_id: user.id,
    account_id: accounts.Checking,
    date: "2026-03-05",
  };
  const { error } = await db.from("transactions").insert([
    { ...base, amount_minor: -4599, description: "WHOLE FOODS MARKET #1234" },
    { ...base, amount_minor: -1200, description: "Whole Foods Market #5678" },
    { ...base, amount_minor: -450, description: "STARBUCKS 4471" },
    { ...base, amount_minor: 300000, description: "ACME PAYROLL" },
    { ...base, amount_minor: -1000, description: "Mystery shop" },
    // The fake would call this Transport; the user's pick must win.
    {
      ...base,
      amount_minor: -1500,
      description: "UBER TRIP",
      category_id: travel!.id,
      category_source: "manual",
    },
  ]);
  if (error) throw error;

  await signInAs(page, user);
  await page.goto("/transactions");
  await expect(panel(page)).toContainText("5 uncategorized transactions");
  await expect(panel(page)).toContainText("Google Gemini");

  await page.waitForLoadState("networkidle");
  await panel(page).getByRole("button", { name: "Auto-categorize" }).click();
  await expect(panel(page)).toContainText("Categorized 4 of 5 transactions.");
  await expect(panel(page)).toContainText("1 uncategorized transaction");

  for (const [description, category] of [
    ["WHOLE FOODS MARKET #1234", "Groceries"],
    ["Whole Foods Market #5678", "Groceries"],
    ["STARBUCKS 4471", "Dining out"],
    ["ACME PAYROLL", "Salary"],
  ]) {
    await expect(row(page, description)).toContainText(category);
    await expect(
      row(page, description).getByLabel("Categorized by AI"),
    ).toBeVisible();
  }
  await expect(row(page, "Mystery shop")).toContainText("Uncategorized");
  await expect(row(page, "UBER TRIP")).toContainText("Travel");
  await expect(
    row(page, "UBER TRIP").getByLabel("Categorized by AI"),
  ).toHaveCount(0);

  const { data: uber } = await db
    .from("transactions")
    .select("category_source")
    .eq("user_id", user.id)
    .eq("description", "UBER TRIP")
    .single();
  expect(uber!.category_source).toBe("manual");

  // Nothing the fake recognizes is left.
  await panel(page).getByRole("button", { name: "Auto-categorize" }).click();
  await expect(panel(page)).toContainText("No confident matches");
});

test("the button is disabled when everything is categorized", async ({
  page,
}) => {
  const user = await createConfirmedUser("ai-done");
  const accounts = await seedAccounts(user.id);
  const { data: salary } = await adminClient()
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Salary")
    .single();
  await adminClient().from("transactions").insert({
    user_id: user.id,
    account_id: accounts.Checking,
    date: "2026-03-05",
    amount_minor: 100000,
    description: "Paycheck",
    category_id: salary!.id,
    category_source: "manual",
  });

  await signInAs(page, user);
  await page.goto("/transactions");
  await expect(panel(page)).toContainText("Everything is categorized.");
  await expect(
    panel(page).getByRole("button", { name: "Auto-categorize" }),
  ).toBeDisabled();
});
