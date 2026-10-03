import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./helpers/auth";
import {
  SEED_ACCOUNTS,
  seedAccounts,
  seedTransactions,
  seedUserTransactions,
  type SeedTransaction,
} from "./helpers/seed";
import { createConfirmedUser } from "./helpers/users";

// Needs the local database: run `npm run db:start` first.

const ROWS = seedTransactions(1000);
const count = (pred: (t: SeedTransaction) => boolean) =>
  ROWS.filter(pred).length.toLocaleString("en-US");

const list = (page: Page) => page.getByRole("list", { name: "Transactions" });
const pagination = (page: Page) =>
  page.getByRole("navigation", { name: "Pagination" });

async function applyFilters(
  page: Page,
  f: {
    q?: string;
    account?: string;
    category?: string;
    from?: string;
    to?: string;
  },
) {
  // Fields picked before React hydrates can be reset by hydration.
  await page.waitForLoadState("networkidle");
  const form = page.getByRole("search", { name: "Filter transactions" });
  if (f.q !== undefined) await form.getByLabel("Search").fill(f.q);
  if (f.account) {
    await form.getByLabel("Account").selectOption({ label: f.account });
  }
  if (f.category) {
    await form.getByLabel("Category").selectOption({ label: f.category });
  }
  if (f.from) await form.getByLabel("From").fill(f.from);
  if (f.to) await form.getByLabel("To").fill(f.to);
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/\/transactions\?/);
}

/** Waits for the unfiltered URL, so the next fill lands on the reset form. */
async function clearFilters(page: Page) {
  await page.getByRole("link", { name: "Clear filters" }).first().click();
  await expect(page).toHaveURL("/transactions");
}

test.describe("with 1,000 seeded transactions", () => {
  // These tests only read, so each worker seeds one user and reuses it.
  let user: Awaited<ReturnType<typeof createConfirmedUser>>;
  test.beforeAll(async () => {
    user = await createConfirmedUser("transactions");
    await seedUserTransactions(user.id, ROWS);
  });

  test.beforeEach(async ({ page }) => {
    await signInAs(page, user);
    await page.goto("/transactions");
  });

  test("pages through every transaction, newest first", async ({ page }) => {
    await expect(pagination(page)).toContainText("Showing 1–50 of 1,000");
    await expect(pagination(page)).toContainText("Page 1 of 20");
    await expect(list(page).getByRole("listitem")).toHaveCount(50);
    // 1,000 rows at four per day: the newest are on day 250 (Sep 7).
    await expect(list(page).getByRole("listitem").first()).toContainText(
      "Sep 7, 2026",
    );
    await expect(
      page.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();

    await page.getByRole("link", { name: "Next page" }).click();
    await expect(pagination(page)).toContainText("Showing 51–100 of 1,000");
    await expect(page).toHaveURL(/page=2/);

    await page.goto("/transactions?page=20");
    await expect(pagination(page)).toContainText("Showing 951–1,000 of 1,000");
    await expect(list(page).getByRole("listitem").last()).toContainText(
      "Jan 1, 2026",
    );
    await expect(
      page.getByRole("button", { name: "Next page" }),
    ).toBeDisabled();
  });

  const FILTER_CASES: {
    name: string;
    filters: Parameters<typeof applyFilters>[1];
    matches: (t: SeedTransaction) => boolean;
  }[] = [
    {
      name: "account",
      filters: { account: "Travel Wallet" },
      matches: (t) => t.account === "Travel Wallet",
    },
    {
      name: "uncategorized",
      filters: { category: "Uncategorized" },
      matches: (t) => t.category === null,
    },
    {
      name: "category",
      filters: { category: "Salary" },
      matches: (t) => t.category === "Salary",
    },
    {
      name: "text, ignoring case",
      filters: { q: "netflix" },
      matches: (t) => t.description.includes("NETFLIX"),
    },
    {
      name: "date range",
      filters: { from: "2026-03-01", to: "2026-03-31" },
      matches: (t) => t.date >= "2026-03-01" && t.date <= "2026-03-31",
    },
  ];

  for (const { name, filters, matches } of FILTER_CASES) {
    test(`filters by ${name}`, async ({ page }) => {
      await applyFilters(page, filters);
      await expect(pagination(page)).toContainText(
        `Showing 1–50 of ${count(matches)}`,
      );
    });
  }

  test("an account filter shows only that account's currency", async ({
    page,
  }) => {
    await applyFilters(page, { account: "Travel Wallet" });
    await expect(pagination(page)).toContainText("of 400");
    await expect(list(page)).toContainText("€");
    await expect(list(page)).not.toContainText("$");
  });

  test("combined filters survive paging and reloads", async ({ page }) => {
    await applyFilters(page, {
      account: "Checking",
      category: "Uncategorized",
      from: "2026-02-01",
    });
    const expected = count(
      (t) =>
        t.account === "Checking" &&
        t.category === null &&
        t.date >= "2026-02-01",
    );
    await expect(pagination(page)).toContainText(`Showing 1–50 of ${expected}`);

    await page.getByRole("link", { name: "Next page" }).click();
    await expect(pagination(page)).toContainText(
      `Showing 51–100 of ${expected}`,
    );

    await page.reload();
    await expect(pagination(page)).toContainText(
      `Showing 51–100 of ${expected}`,
    );
    const form = page.getByRole("search", { name: "Filter transactions" });
    await expect(form.getByLabel("From")).toHaveValue("2026-02-01");
    await expect(form.getByLabel("Category")).toHaveValue("none");
  });

  test("text search matches literally and shows an empty state", async ({
    page,
  }) => {
    await applyFilters(page, { q: "100%" });
    await expect(
      page.getByText("No transactions match these filters"),
    ).toBeVisible();

    await clearFilters(page);
    await expect(pagination(page)).toContainText("of 1,000");
    await expect(page.getByLabel("Search")).toHaveValue("");
  });

  test("account balances include their transactions", async ({ page }) => {
    await page.goto("/accounts");
    for (const account of SEED_ACCOUNTS) {
      const sum = ROWS.filter((t) => t.account === account.name).reduce(
        (total: number, t) => total + t.amountMinor,
        account.opening as number,
      );
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: account.currency,
      }).format(sum / 100);
      await expect(
        page
          .getByRole("list", { name: "Accounts" })
          .getByRole("listitem")
          .filter({ hasText: account.name }),
      ).toContainText(formatted);
    }
  });
});

test("a new user is asked to add an account first", async ({ page }) => {
  await signInAs(page, await createConfirmedUser("transactions-empty"));
  await page.goto("/transactions");
  await expect(page.getByText("Add an account first")).toBeVisible();
  await page.getByRole("link", { name: "Go to accounts" }).click();
  await expect(page).toHaveURL("/accounts");
});

test("an account without transactions shows an empty list", async ({
  page,
}) => {
  const user = await createConfirmedUser("transactions-none");
  await seedAccounts(user.id);
  await signInAs(page, user);
  await page.goto("/transactions");
  await expect(page.getByText("No transactions yet")).toBeVisible();
});
