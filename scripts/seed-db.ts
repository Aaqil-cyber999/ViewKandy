import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { categories, places } from "../lib/db/schema";
import { categorySchema, placeSchema } from "../lib/data/schema";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:seed] DATABASE_URL is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

function readSeed(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`../data/seed/${name}`, import.meta.url), "utf8"),
  ) as unknown;
}

const parsedCategories = (readSeed("categories.json") as unknown[]).map((category) =>
  categorySchema.parse(category),
);
const parsedPlaces = (readSeed("places.json") as unknown[]).map((place) =>
  placeSchema.parse(place),
);

const hostname = new URL(url).hostname;
const local = ["localhost", "127.0.0.1", "::1"].includes(hostname);

const pool = new Pool({
  connectionString: url,
  ssl: local ? undefined : { rejectUnauthorized: false },
  max: 2,
  application_name: "kandyverse-seed",
});

const db = drizzle(pool);

try {
  for (const category of parsedCategories) {
    const row = {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      order: category.order,
    };
    await db
      .insert(categories)
      .values(row)
      .onConflictDoUpdate({ target: categories.id, set: row });
  }
  console.log(`[db:seed] upserted ${parsedCategories.length} categories`);

  for (const place of parsedPlaces) {
    const row = {
      id: place.id,
      slug: place.slug,
      name: place.name,
      categorySlug: place.category,
      summary: place.summary,
      description: place.description,
      lat: place.lat,
      lng: place.lng,
      address: place.address,
      website: place.website,
      phone: place.phone,
      openingHours: place.openingHours,
      entryFeeLkr: place.entryFeeLkr === null ? null : String(place.entryFeeLkr),
      estimatedVisitMinutes: place.estimatedVisitMinutes,
      accessibility: place.accessibility,
      tags: place.tags,
      indoor: place.indoor,
      bestTime: place.bestTime,
      practicalNotes: place.practicalNotes,
      verificationStatus: place.verification.status,
      verificationSource: place.verification.source,
      verificationSourceUrl: place.verification.sourceUrl,
      lastVerifiedAt: place.verification.lastVerifiedAt
        ? new Date(place.verification.lastVerifiedAt)
        : null,
      locationAccuracy: place.locationAccuracy,
      featured: place.featured,
      priority: place.priority,
    };
    const { id, ...updatable } = row;
    await db
      .insert(places)
      .values(row)
      .onConflictDoUpdate({ target: places.id, set: updatable });
  }
  console.log(`[db:seed] upserted ${parsedPlaces.length} places (all unverified by design)`);
} catch (error) {
  console.error("[db:seed] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => undefined);
}
