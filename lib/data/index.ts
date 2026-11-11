import categoriesJson from "@/data/seed/categories.json";
import placesJson from "@/data/seed/places.json";
import toursJson from "@/data/seed/tours.json";
import type { Category, CategorySlug, Place } from "@/types/place";
import type { Tour } from "@/types/tour";
import { categorySchema, placeSchema, tourSchema } from "./schema";

/**
 * The seed dataset is validated at module load. In production the same shapes
 * are served from PostgreSQL through Drizzle (see lib/db/schema.ts) and merged
 * with admin overrides by lib/db.
 */
export const seedCategories: Category[] = categoriesJson.map((c) => categorySchema.parse(c));

export const seedPlaces: Place[] = placesJson.map((p) => placeSchema.parse(p));

export const seedTours: Tour[] = toursJson.map((t) => tourSchema.parse(t));

export const categoryBySlug = new Map<CategorySlug, Category>(
  seedCategories.map((c) => [c.slug, c]),
);

export const placeBySlug = new Map<string, Place>(seedPlaces.map((p) => [p.slug, p]));

export const tourBySlug = new Map<string, Tour>(seedTours.map((t) => [t.slug, t]));

export function getCategory(slug: CategorySlug): Category {
  const category = categoryBySlug.get(slug);
  if (!category) throw new Error(`Unknown category: ${slug}`);
  return category;
}

/** Categories that make sense as itinerary stops. */
export const VISITABLE_CATEGORIES: CategorySlug[] = [
  "heritage",
  "religious",
  "nature",
  "viewpoint",
  "museum",
  "experience",
  "food",
  "shopping",
];

export const INTEREST_CATEGORIES: CategorySlug[] = [
  "heritage",
  "religious",
  "nature",
  "viewpoint",
  "museum",
  "experience",
  "food",
  "shopping",
];
