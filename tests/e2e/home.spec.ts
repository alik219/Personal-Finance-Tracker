import { expect, test } from "@playwright/test";

test("home page renders the app name", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Personal Finance Tracker");
  await expect(
    page.getByRole("heading", { name: "Personal Finance Tracker" }),
  ).toBeVisible();
});
