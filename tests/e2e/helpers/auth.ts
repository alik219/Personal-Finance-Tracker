import { expect, type Page } from "@playwright/test";

export async function logIn(page: Page, email: string, password: string) {
  // Wait for the login page itself, so typing never lands on the previous page.
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/** Logs in from scratch and waits for the dashboard. */
export async function signInAs(
  page: Page,
  user: { email: string; password: string },
) {
  await page.goto("/login");
  await logIn(page, user.email, user.password);
  await expect(page).toHaveURL("/dashboard");
}

/** On phones, sign out lives in the bottom bar's "More" sheet. */
export async function signOut(page: Page) {
  const more = page.getByRole("button", { name: "More" });
  if (await more.isVisible()) await more.click();
  await page.getByRole("button", { name: "Sign out" }).click();
  // Wait for the session to be cleared before anything else navigates.
  await expect(page).toHaveURL("/login");
}
