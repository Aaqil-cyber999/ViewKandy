import { z } from "zod";
import { distanceMeters } from "@/lib/geo/distance";
import type { LatLng } from "@/types/place";

/**
 * Google Places API (New) adapter.
 *
 * Live Google listings are deliberately kept separate from the editorial
 * catalogue: they are external, may change at any time, and are never treated
 * as KandyVerse verification. The UI labels them and links back to Google.
 */

export interface ExternalPlace {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  rating: number | null;
  userRatingCount: number | null;
  openNow: boolean | null;
  types: string[];
  googleMapsUri: string | null;
}

export interface GooglePlacesResult {
  source: "google_places" | "unavailable";
  places: ExternalPlace[];
  warning?: string;
  fetchedAt?: string;
}

const googlePlaceSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }).optional(),
  formattedAddress: z.string().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  googleMapsUri: z.string().optional(),
  types: z.array(z.string()).optional(),
  currentOpeningHours: z.object({ openNow: z.boolean() }).optional(),
});

const googleResponseSchema = z.object({
  places: z.array(googlePlaceSchema).optional(),
});

export type GooglePlacePayload = z.infer<typeof googlePlaceSchema>;

const DEFAULT_TYPES = [
  "atm",
  "bank",
  "pharmacy",
  "hospital",
  "restaurant",
  "cafe",
  "store",
  "transit_station",
  "parking",
  "tourist_attraction",
] as const;

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: GooglePlacesResult }>();

export function googlePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_SERVER_API_KEY);
}

export function clearGooglePlacesCache(): void {
  cache.clear();
}

/**
 * Normalises one Google Places (New) result. Returns null rather than inventing
 * a name or coordinate when the upstream record is incomplete.
 */
export function normalizeGooglePlace(
  raw: GooglePlacePayload,
  center: LatLng,
): ExternalPlace | null {
  const name = raw.displayName?.text?.trim();
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  if (!name || lat === undefined || lng === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: raw.id,
    name,
    address: raw.formattedAddress?.trim() || null,
    lat,
    lng,
    distanceMeters: distanceMeters(center, { lat, lng }),
    rating: raw.rating ?? null,
    userRatingCount: raw.userRatingCount ?? null,
    openNow: raw.currentOpeningHours?.openNow ?? null,
    types: raw.types ?? [],
    googleMapsUri: raw.googleMapsUri ?? null,
  };
}

function unavailable(warning: string): GooglePlacesResult {
  return { source: "unavailable", places: [], warning };
}

export async function fetchNearbyGooglePlaces(
  center: LatLng,
  radiusMeters = 1200,
): Promise<GooglePlacesResult> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) {
    return unavailable(
      "Live Google Places enrichment is not configured for this deployment.",
    );
  }

  const radius = Math.max(100, Math.min(3000, Math.round(radiusMeters)));
  const cacheKey = `${center.lat.toFixed(4)},${center.lng.toFixed(4)},${radius}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const body = {
    includedTypes: [...DEFAULT_TYPES],
    maxResultCount: 12,
    rankPreference: "DISTANCE",
    languageCode: "en",
    locationRestriction: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius,
      },
    },
  };

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.location",
          "places.rating",
          "places.userRatingCount",
          "places.googleMapsUri",
          "places.types",
          "places.currentOpeningHours.openNow",
        ].join(","),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[google-places] Places API returned ${response.status}`);
      return unavailable("Live Google Places data is unavailable right now.");
    }

    const parsed = googleResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.error("[google-places] unexpected response shape");
      return unavailable("Live Google Places data could not be read.");
    }

    const places = (parsed.data.places ?? [])
      .map((place) => normalizeGooglePlace(place, center))
      .filter((place): place is ExternalPlace => place !== null)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const result: GooglePlacesResult = {
      source: "google_places",
      places,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  } catch (error) {
    console.error("[google-places] fetch failed:", error);
    return unavailable("Live Google Places data is unavailable right now.");
  }
}
