import { expect, test } from "@playwright/test";

// Needs the local database: run `npm run db:start` first.
test("health page reads the time from the database", async ({ page }) => {
  await page.goto("/health");
  await expect(
    page.getByRole("heading", { name: "Database connected" }),
  ).toBeVisible();
  await expect(page.getByText(/Server time: \d{4}-\d{2}-\d{2}/)).toBeVisible();
});
