import { expect, test } from "@playwright/test";

test("GET /api/places returns the honest seed catalogue", async ({ request }) => {
  const response = await request.get("/api/places");
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.count).toBe(34);
  expect(body.places).toHaveLength(34);
  expect(body.places[0].verification.status).toBe("unverified");
  expect(body.places.every((place: { openingHours: unknown }) => place.openingHours === null)).toBe(
    true,
  );
});

test("GET /api/places filters by category and query", async ({ request }) => {
  const filtered = await request.get("/api/places?category=religious&limit=5");
  expect(filtered.status()).toBe(200);
  const body = await filtered.json();
  expect(body.count).toBeGreaterThan(0);
  expect(body.places.every((place: { category: string }) => place.category === "religious")).toBe(
    true,
  );

  const search = await request.get("/api/places?q=kandy%20lake");
  const searchBody = await search.json();
  expect(searchBody.places[0].slug).toBe("kandy-lake");
});

test("GET /api/places/:slug returns a place and nearby places", async ({ request }) => {
  const response = await request.get("/api/places/kandy-lake");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.place.slug).toBe("kandy-lake");
  expect(Array.isArray(body.nearby)).toBe(true);
  expect(body.nearby.every((place: { slug: string }) => place.slug !== "kandy-lake")).toBe(
    true,
  );

  const missing = await request.get("/api/places/not-a-real-place");
  expect(missing.status()).toBe(404);
});

test("POST /api/assistant validates input and answers in grounded mode", async ({
  request,
}) => {
  const invalid = await request.post("/api/assistant", { data: { message: "   " } });
  expect(invalid.status()).toBe(400);

  const response = await request.post("/api/assistant", {
    data: { message: "Where can I eat near Kandy Lake?" },
  });
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(typeof body.answer).toBe("string");
  expect(body.answer.length).toBeGreaterThan(20);
  expect(Array.isArray(body.places)).toBe(true);
  expect(["local", "openai"]).toContain(body.mode);
});

test("PWA manifest, robots and sitemap are served", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const manifestBody = await manifest.json();
  expect(manifestBody.short_name).toBe("KandyVerse");
  expect(manifestBody.icons.length).toBeGreaterThanOrEqual(3);

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsBody = await robots.text();
  expect(robotsBody).toContain("Sitemap:");
  expect(robotsBody).toContain("Disallow: /admin");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain("<urlset");
  expect(sitemapBody).toContain("/explore");
  expect(sitemapBody).toContain("/places/kandy-lake");
});

test("security headers are applied", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["referrer-policy"]).toBeTruthy();
});
