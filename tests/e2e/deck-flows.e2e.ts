import { expect, test } from "@playwright/test";

test.describe("deck core flows (AC-005 / TC-004, TC-005, TC-006)", () => {
  test("should load the seeded decks into the sidebar and open a deck", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText("Spanish")).toBeVisible();
    await expect(page.getByText("Capitals")).toBeVisible();
    await expect(page.getByText("Verbs")).toBeVisible();

    await page.getByText("Spanish").click();

    await expect(page.getByText("5 cards")).toBeVisible();
  });

  test("should study a deck and grade a card", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Spanish").click();
    await page.getByRole("button", { name: "Study" }).click();

    await expect(page.getByText("hola")).toBeVisible();

    await page.getByRole("button", { name: "Flip card" }).click();
    await expect(page.getByText("hello")).toBeVisible();

    await page.getByRole("button", { name: "Good" }).click();

    await expect(page.getByText("gato")).toBeVisible();
  });

  test("should open settings and toggle a setting", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Spanish")).toBeVisible();

    await page.getByRole("button", { name: "New tab" }).click();

    await expect(page.getByRole("tab", { name: /Settings/ })).toBeVisible();

    const dark = page.getByRole("button", { name: "Dark" });
    await dark.click();
    await expect(dark).toHaveAttribute("aria-pressed", "true");
  });
});
