import { expect, test } from "@playwright/test";

test.describe("mobile shell", () => {
  test("home page is usable on a phone viewport", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Explore Kandy",
    );
    await expect(
      page.getByRole("navigation", { name: /quick navigation/i }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /explore in 3d/i }).first()).toBeVisible();
  });

  test("mobile navigation reaches the planner", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation", { name: /quick navigation/i }).first();
    await nav.getByRole("link", { name: /plan/i }).first().click();

    await expect(page).toHaveURL(/\/planner/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Turn a free afternoon into a walkable plan",
    );
  });
});
