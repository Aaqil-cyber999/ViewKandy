import type { CategorySlug, Place } from "@/types/place";

const KANDY_POINTS = [
  { lat: 7.2936, lng: 80.6413 },
  { lat: 7.2906, lng: 80.6337 },
  { lat: 7.2961, lng: 80.6395 },
  { lat: 7.2867, lng: 80.6412 },
  { lat: 7.3001, lng: 80.6301 },
];

let counter = 0;

/**
 * Builds a realistic Place fixture. Defaults deliberately mirror the seed
 * policy: unverified, no hours, no fee and no phone number.
 */
export function makePlace(overrides: Partial<Place> & { slug: string }): Place {
  const index = counter % KANDY_POINTS.length;
  counter += 1;
  const point = KANDY_POINTS[index]!;

  return {
    id: `place-${overrides.slug}`,
    name: overrides.slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    category: "heritage" as CategorySlug,
    summary: `Summary for ${overrides.slug}.`,
    description: `Description for ${overrides.slug} in Kandy.`,
    lat: point.lat,
    lng: point.lng,
    address: null,
    website: null,
    phone: null,
    openingHours: null,
    entryFeeLkr: null,
    estimatedVisitMinutes: 60,
    accessibility: null,
    tags: ["kandy"],
    indoor: false,
    bestTime: null,
    practicalNotes: null,
    verification: {
      status: "unverified",
      source: "KandyVerse editorial seed",
      sourceUrl: null,
      lastVerifiedAt: null,
    },
    locationAccuracy: "approximate",
    featured: false,
    priority: 0,
    ...overrides,
  };
}

export function makePlaces(specs: Array<Partial<Place> & { slug: string }>): Place[] {
  return specs.map((spec) => makePlace(spec));
}
