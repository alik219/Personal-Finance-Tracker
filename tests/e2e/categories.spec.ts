import { expect, test, type Page } from "@playwright/test";

import { signInAs, signOut } from "./helpers/auth";
import { createConfirmedUser } from "./helpers/users";

// Needs the local database: run `npm run db:start` first.

const list = (page: Page, kind: "Expenses" | "Income") =>
  page.getByRole("list", { name: `${kind} categories` });
const row = (page: Page, kind: "Expenses" | "Income", name: string) =>
  list(page, kind).getByRole("listitem").filter({ hasText: name });

async function addCategory(
  page: Page,
  {
    name,
    kind,
    color,
    icon,
  }: { name: string; kind?: "Income"; color?: string; icon?: string },
) {
  await page.getByRole("button", { name: "Add category" }).click();
  const dialog = page.getByRole("dialog", { name: "Add category" });
  await dialog.getByLabel("Name").fill(name);
  if (kind) await dialog.getByLabel("Type").selectOption({ label: kind });
  if (color) await dialog.getByRole("radio", { name: color }).check();
  if (icon) await dialog.getByRole("radio", { name: icon }).check();
  await dialog.getByRole("button", { name: "Add category" }).click();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await signInAs(page, await createConfirmedUser("categories"));
  await page.goto("/settings/categories");
});

test("a new user starts with the default categories", async ({ page }) => {
  await expect(list(page, "Expenses").getByRole("listitem")).toHaveCount(13);
  await expect(list(page, "Income").getByRole("listitem")).toHaveCount(4);
  await expect(row(page, "Expenses", "Groceries")).toBeVisible();
  await expect(row(page, "Income", "Salary")).toBeVisible();
});

test("settings links to the category manager", async ({ page, isMobile }) => {
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Main" });
  if (isMobile) await nav.getByRole("button", { name: "More" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("link", { name: /Categories/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Categories" }),
  ).toBeVisible();
});

test("add expense and income categories; names are unique per type", async ({
  page,
}) => {
  const pets = await addCategory(page, {
    name: "Pets",
    color: "Amber",
    icon: "Paw print",
  });
  await expect(pets).toBeHidden();
  await expect(row(page, "Expenses", "Pets")).toBeVisible();

  await addCategory(page, { name: "Side hustle", kind: "Income" });
  await expect(row(page, "Income", "Side hustle")).toBeVisible();

  const dupe = await addCategory(page, { name: "groceries" });
  await expect(
    dupe.getByText("You already have a category with this name."),
  ).toBeVisible();
  await expect(dupe.getByLabel("Name")).toHaveValue("groceries");
  await dupe.getByRole("button", { name: "Close" }).click();

  // The same name is fine under the other type.
  await addCategory(page, { name: "Groceries", kind: "Income" });
  await expect(row(page, "Income", "Groceries")).toBeVisible();
});

test("rename and recolor a category", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Dining out" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit category" });
  await expect(dialog.getByLabel("Type")).toHaveCount(0);
  await expect(dialog.getByRole("radio", { name: "Orange" })).toBeChecked();

  await dialog.getByLabel("Name").fill("Restaurants");
  await dialog.getByRole("radio", { name: "Red" }).check();
  await dialog.getByRole("radio", { name: "Coffee" }).check();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();

  await expect(row(page, "Expenses", "Restaurants")).toBeVisible();
  await expect(row(page, "Expenses", "Dining out")).toHaveCount(0);

  await page.getByRole("button", { name: "Edit Restaurants" }).click();
  await expect(dialog.getByRole("radio", { name: "Red" })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: "Coffee" })).toBeChecked();
});

test("hide and show a category", async ({ page }) => {
  await page.getByRole("button", { name: "Hide Travel" }).click();
  await expect(row(page, "Expenses", "Travel")).toContainText("Hidden");

  await page.reload();
  await page.getByRole("button", { name: "Show Travel" }).click();
  await expect(row(page, "Expenses", "Travel")).not.toContainText("Hidden");
  await expect(page.getByRole("button", { name: "Hide Travel" })).toBeVisible();
});

test("delete a category after confirming", async ({ page }) => {
  await page.getByRole("button", { name: "Delete Education" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete Education?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(row(page, "Expenses", "Education")).toBeVisible();

  await page.getByRole("button", { name: "Delete Education" }).click();
  await dialog.getByRole("button", { name: "Delete category" }).click();
  await expect(dialog).toBeHidden();
  await expect(row(page, "Expenses", "Education")).toHaveCount(0);
  await expect(list(page, "Expenses").getByRole("listitem")).toHaveCount(12);
});

test("categories are private to each user", async ({ page }) => {
  await addCategory(page, { name: "Alice Only" });
  await expect(row(page, "Expenses", "Alice Only")).toBeVisible();

  await signOut(page);
  await signInAs(page, await createConfirmedUser("categories-other"));
  await page.goto("/settings/categories");

  await expect(list(page, "Expenses").getByRole("listitem")).toHaveCount(13);
  await expect(page.getByText("Alice Only")).toHaveCount(0);
});
