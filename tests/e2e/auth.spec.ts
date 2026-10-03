import { expect, test, type Page } from "@playwright/test";

import { logIn, signOut } from "./helpers/auth";
import { getEmailLink } from "./helpers/mailpit";
import {
  createConfirmedUser,
  TEST_PASSWORD,
  uniqueEmail,
} from "./helpers/users";

// Needs the local database: run `npm run db:start` first.

// Scoped to <main>: Next.js adds its own role="alert" route announcer.
const formAlert = (page: Page) => page.getByRole("main").getByRole("alert");
const formStatus = (page: Page) => page.getByRole("main").getByRole("status");

test("sign up, confirm by email, and land on the dashboard", async ({
  page,
}) => {
  const email = uniqueEmail("signup");

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Alice Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  // Can't log in before confirming.
  await page.goto("/login");
  await logIn(page, email, TEST_PASSWORD);
  await expect(formAlert(page)).toContainText("confirm your email");

  const link = await getEmailLink(email, {
    subject: "Confirm your",
    linkPath: "/auth/confirm",
  });
  await page.goto(link);

  await expect(page).toHaveURL("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Welcome, Alice Tester" }),
  ).toBeVisible();
});

test("sign-up form shows validation errors", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Bob");
  await page.getByLabel("Email").fill(uniqueEmail("weak"));
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  // Typed values survive the failed submit.
  await expect(page.getByLabel("Name")).toHaveValue("Bob");
});

test("signed-out visitors are sent to login and returned afterwards", async ({
  page,
}) => {
  const user = await createConfirmedUser("redirect");

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login?next=%2Fdashboard");

  await logIn(page, user.email, user.password);
  await expect(page).toHaveURL("/dashboard");
});

test("wrong password shows an error", async ({ page }) => {
  const user = await createConfirmedUser("wrongpw");

  await page.goto("/login");
  await logIn(page, user.email, "Wrong-pass-999");

  await expect(formAlert(page)).toHaveText("Incorrect email or password.");
  await expect(page.getByLabel("Email")).toHaveValue(user.email);
});

test("login ignores off-site next links", async ({ page }) => {
  const user = await createConfirmedUser("nextevil");

  await page.goto("/login?next=https://evil.example");
  await logIn(page, user.email, user.password);

  await expect(page).toHaveURL("/dashboard");
});

test("signed-in users skip login, and signing out locks the app again", async ({
  page,
}) => {
  const user = await createConfirmedUser("signout", { displayName: "Sam" });

  await page.goto("/login");
  await logIn(page, user.email, user.password);
  await expect(
    page.getByRole("heading", { name: "Welcome, Sam" }),
  ).toBeVisible();

  await page.goto("/login");
  await expect(page).toHaveURL("/dashboard");

  await signOut(page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login?next=%2Fdashboard");
});

test("reset a forgotten password by email", async ({ page }) => {
  const user = await createConfirmedUser("reset");
  const newPassword = "New-pass-456";

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Forgot your password?" }),
  ).toBeVisible();
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(formStatus(page)).toContainText("If an account exists");

  const link = await getEmailLink(user.email, {
    subject: "Reset your",
    linkPath: "/auth/confirm",
  });
  await page.goto(link);
  await expect(page).toHaveURL("/reset-password");

  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();

  await expect(formStatus(page)).toHaveText("Your password has been updated.");

  // Old password no longer works; the new one does.
  await signOut(page);
  await logIn(page, user.email, user.password);
  await expect(formAlert(page)).toHaveText("Incorrect email or password.");
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/dashboard");
});

test("an invalid email link shows a friendly error", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=not-a-real-token&type=email");
  await expect(page).toHaveURL("/login?error=link_invalid");
  await expect(formAlert(page)).toContainText("invalid or has expired");
});
