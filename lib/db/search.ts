import type { CategorySlug, Place, PlaceWithDistance } from "@/types/place";
import { distanceMeters } from "@/lib/geo/distance";

export interface SearchOptions {
  q?: string;
  categories?: CategorySlug[];
  near?: { lat: number; lng: number };
  maxDistanceMeters?: number;
  indoorOnly?: boolean;
  featuredOnly?: boolean;
  limit?: number;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textScore(place: Place, query: string): number {
  const q = normalise(query);
  if (!q) return 0;
  const name = normalise(place.name);
  const tags = place.tags.map(normalise);
  const summary = normalise(place.summary);
  const description = normalise(place.description);
  const category = normalise(place.category);

  let score = 0;
  if (name === q) score += 120;
  else if (name.startsWith(q)) score += 70;
  else if (name.includes(q)) score += 50;
  if (tags.some((t) => t === q)) score += 35;
  else if (tags.some((t) => t.includes(q))) score += 22;
  if (summary.includes(q)) score += 16;
  if (description.includes(q)) score += 8;
  if (category.includes(q)) score += 12;

  // Multi-word: require every token somewhere.
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const haystack = `${name} ${tags.join(" ")} ${summary} ${description} ${category}`;
    if (tokens.every((token) => haystack.includes(token))) score += 25;
  }
  return score;
}

export function searchPlaces(places: Place[], options: SearchOptions = {}): PlaceWithDistance[] {
  const query = options.q?.trim() ?? "";
  const categories = options.categories?.length ? new Set(options.categories) : null;

  const filtered = places.filter((place) => {
    if (categories && !categories.has(place.category)) return false;
    if (options.indoorOnly && !place.indoor) return false;
    if (options.featuredOnly && !place.featured) return false;
    return true;
  });

  const scored = filtered.map((place) => {
    const distance = options.near ? distanceMeters(options.near, place) : Number.POSITIVE_INFINITY;
    const relevance = textScore(place, query);
    return { place, distance, relevance };
  });

  const results = scored
    .filter((entry) => {
      if (query && entry.relevance <= 0) return false;
      if (
        options.maxDistanceMeters !== undefined &&
        Number.isFinite(entry.distance) &&
        entry.distance > options.maxDistanceMeters
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      if (b.place.priority !== a.place.priority) return b.place.priority - a.place.priority;
      return a.place.name.localeCompare(b.place.name);
    })
    .slice(0, options.limit ?? 200);

  return results.map((entry) => ({
    ...entry.place,
    distanceMeters: entry.distance,
  }));
}

export function findNearby(
  places: Place[],
  center: { lat: number; lng: number },
  radiusMeters: number,
  categories?: CategorySlug[],
  limit = 20,
): PlaceWithDistance[] {
  const set = categories?.length ? new Set(categories) : null;
  return places
    .filter((p) => (set ? set.has(p.category) : true))
    .map((p) => ({ ...p, distanceMeters: distanceMeters(center, p) }))
    .filter((p) => p.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}
