import { expect, test } from "@playwright/test";

import { signInAs } from "./helpers/auth";
import { createConfirmedUser } from "./helpers/users";

// Needs the local database: run `npm run db:start` first.

test.beforeEach(async ({ page }) => {
  await signInAs(page, await createConfirmedUser("shell"));
});

test("navigation reaches every section", async ({ page, isMobile }) => {
  const nav = page.getByRole("navigation", { name: "Main" });

  // Primary sections: sidebar on desktop, bottom tabs on phones.
  for (const name of ["Transactions", "Accounts", "Budgets", "Dashboard"]) {
    const link = nav.getByRole("link", { name });
    await link.click();
    await expect(link).toHaveAttribute("aria-current", "page");
  }

  // Secondary sections: in the sidebar on desktop, under "More" on phones.
  for (const name of ["Recurring", "Goals", "Import", "Settings"]) {
    if (isMobile) await nav.getByRole("button", { name: "More" }).click();
    await page.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  }
});

test("desktop shows the sidebar, phones show the bottom bar", async ({
  page,
  isMobile,
}) => {
  const more = page.getByRole("button", { name: "More" });
  if (isMobile) {
    await expect(more).toBeVisible();
  } else {
    await expect(more).toBeHidden();
    // The sidebar keeps the account email and sign out in view.
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  }
});

test("dark mode toggles and survives a reload", async ({ page }) => {
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: "Toggle dark mode" });

  const startsDark = await html.evaluate((el) => el.classList.contains("dark"));
  await toggle.click();
  await expect(html).toHaveClass(startsDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);

  await page.reload();
  await expect(html).toHaveClass(startsDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
});

test("quick add button opens from any page", async ({ page }) => {
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Quick add transaction" }).click();
  await expect(
    page.getByRole("dialog", { name: "Add a transaction" }),
  ).toBeVisible();
});
