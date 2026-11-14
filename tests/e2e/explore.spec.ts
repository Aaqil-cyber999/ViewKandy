import { expect, test } from "@playwright/test";

test("explore renders place markers and lets a result be selected", async ({ page }) => {
  await page.goto("/explore", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Every place, one map" })).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: /^Show .* on the map$/ }).first().click();
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
});
