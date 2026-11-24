import { expect, test } from "@playwright/test";
import { waitForReactHydration } from "./helpers";

const PAGES = [
  { path: "/", heading: "Discover the soul of Sri Lanka in Kandy." },
  { path: "/explore", heading: "Every place, one map" },
  { path: "/places", heading: "Places that actually exist" },
  { path: "/updates", heading: "Live visitor updates" },
  { path: "/planner", heading: "Turn a free afternoon into a walkable plan" },
  { path: "/assistant", heading: "Ask a guide that checks the database first" },
  { path: "/tours", heading: "See the shape of the city first" },
  { path: "/saved", heading: "Saved places, plans and pins" },
  { path: "/admin", heading: "Editorial console" },
  { path: "/auth", heading: "Keep your Kandy plans across devices" },
  { path: "/security", heading: "Security and trust" },
  { path: "/offline", heading: "You are offline" },
];

test.describe("public pages", () => {
  for (const page of PAGES) {
    test(`${page.path} renders its heading`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(page.path, {
        waitUntil: "domcontentloaded",
      });

      expect(response?.status(), page.path).toBe(200);
      await expect(
        browserPage.getByRole("heading", { level: 1 }).first(),
      ).toContainText(page.heading);
    });
  }
});

test("the trust center risk explorer filters the security register", async ({ page }) => {
  await page.goto("/security", { waitUntil: "domcontentloaded" });
  await waitForReactHydration(page, 'input[type="search"]');

  const search = page.getByLabel("Search the audit");
  await search.fill("RLS");

  await expect(page.getByText(/of 20 risks/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /API1: Broken object-level authorization/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /A05: Injection/ }),
  ).toHaveCount(0);
});

test("a place detail page shows real coordinates and an honest verification state", async ({
  page,
}) => {
  await page.goto("/places/kandy-lake", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kandy Lake");
  await expect(page.getByText("Unverified").first()).toBeVisible();
  await expect(page.getByText(/7\.29\d+,\s*80\.6\d+/).first()).toBeVisible();
});

test("unknown routes render the branded 404", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist", {
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This page could not be found",
  );
});

test("the assistant answers without an API key using the grounded engine", async ({
  page,
}) => {
  await page.goto("/assistant", { waitUntil: "domcontentloaded" });

  await waitForReactHydration(
    page,
    'textarea[aria-label="Message the View Kandy guide"]',
  );

  const input = page.getByLabel("Message the View Kandy guide");
  const send = page.getByRole("button", { name: "Send message" });

  await input.fill("What can I see near Kandy Lake?");
  await expect(input).toHaveValue("What can I see near Kandy Lake?");
  await expect(send).toBeEnabled();
  await send.click();

  await expect(page.getByText(/Kandy Lake/i).first()).toBeVisible({
    timeout: 30_000,
  });
});
