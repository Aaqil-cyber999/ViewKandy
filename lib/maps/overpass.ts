import { z } from "zod";
import { distanceMeters } from "@/lib/geo/distance";
import type { LatLng } from "@/types/place";

/**
 * OpenStreetMap / Overpass adapter for live nearby services.
 *
 * This is external community data, not KandyVerse verification. Every result
 * links back to its OSM node and carries the ODbL attribution in the UI.
 */

export interface OsmService {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  address: string | null;
  openingHours: string | null;
  phone: string | null;
  website: string | null;
  osmUrl: string;
}

export interface OsmServicesResult {
  source: "openstreetmap" | "unavailable";
  services: OsmService[];
  warning?: string;
  fetchedAt?: string;
  license?: "ODbL";
}

const elementSchema = z.object({
  type: z.string(),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

const overpassResponseSchema = z.object({
  elements: z.array(elementSchema).optional(),
});

export type OsmElementPayload = z.infer<typeof elementSchema>;

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: OsmServicesResult }>();

const CATEGORY_LABELS: Record<string, string> = {
  atm: "ATM",
  bank: "Bank",
  pharmacy: "Pharmacy",
  hospital: "Hospital",
  toilets: "Public toilets",
  drinking_water: "Drinking water",
  fuel: "Fuel station",
  supermarket: "Supermarket",
  convenience: "Convenience store",
  information: "Tourist information",
};

export function clearOsmServicesCache(): void {
  cache.clear();
}

function categoryFor(tags: Record<string, string>): string {
  if (tags.amenity) return CATEGORY_LABELS[tags.amenity] ?? tags.amenity.replaceAll("_", " ");
  if (tags.shop) return CATEGORY_LABELS[tags.shop] ?? tags.shop.replaceAll("_", " ");
  if (tags.tourism) return CATEGORY_LABELS[tags.tourism] ?? tags.tourism.replaceAll("_", " ");
  return "Service";
}

function addressFor(tags: Record<string, string>): string | null {
  if (tags["addr:full"]) return tags["addr:full"];
  const street = tags["addr:street"];
  if (!street) return null;
  const number = tags["addr:housenumber"];
  return number ? `${number} ${street}` : street;
}

/** Normalises one Overpass node without inventing missing fields. */
export function normalizeOsmElement(
  raw: OsmElementPayload,
  center: LatLng,
): OsmService | null {
  if (raw.type !== "node") return null;
  const lat = raw.lat;
  const lng = raw.lon;
  if (lat === undefined || lng === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const tags = raw.tags ?? {};
  const category = categoryFor(tags);
  const name = tags["name:en"] ?? tags.name ?? `${category} (unnamed in OSM)`;

  return {
    id: `node/${raw.id}`,
    name,
    category,
    lat,
    lng,
    distanceMeters: distanceMeters(center, { lat, lng }),
    address: addressFor(tags),
    openingHours: tags.opening_hours ?? null,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
    osmUrl: `https://www.openstreetmap.org/node/${raw.id}`,
  };
}

function unavailable(warning: string): OsmServicesResult {
  return { source: "unavailable", services: [], warning };
}

function overpassEndpoints(): string[] {
  const configured = process.env.OVERPASS_ENDPOINT?.trim();
  const endpoints = [
    configured,
    "https://overpass-api.de/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
  ].filter((endpoint): endpoint is string => Boolean(endpoint));
  return [...new Set(endpoints)];
}

function buildQuery(center: LatLng, radius: number): string {
  const around = `around:${radius},${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;
  return [
    "[out:json][timeout:10];",
    "(",
    `node(${around})[amenity~"^(atm|bank|pharmacy|hospital|toilets|drinking_water|fuel)$"];`,
    `node(${around})[shop~"^(supermarket|convenience)$"];`,
    `node(${around})[tourism="information"];`,
    ");",
    "out body 40;",
  ].join("\n");
}

export async function fetchNearbyOsmServices(
  center: LatLng,
  radiusMeters = 1200,
): Promise<OsmServicesResult> {
  const radius = Math.max(100, Math.min(3000, Math.round(radiusMeters)));
  const cacheKey = `${center.lat.toFixed(4)},${center.lng.toFixed(4)},${radius}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const contact = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const endpoint of overpassEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": `KandyVerse/1.0 (+${contact})`,
        },
        body: new URLSearchParams({ data: buildQuery(center, radius) }).toString(),
        signal: AbortSignal.timeout(9000),
        cache: "no-store",
      });

      if (!response.ok) {
        console.error(`[overpass] ${endpoint} returned ${response.status}`);
        continue;
      }

      const parsed = overpassResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        console.error(`[overpass] ${endpoint} returned an unexpected response shape`);
        continue;
      }

      const services = (parsed.data.elements ?? [])
        .map((element) => normalizeOsmElement(element, center))
        .filter((service): service is OsmService => service !== null)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 30);

      const result: OsmServicesResult = {
        source: "openstreetmap",
        services,
        fetchedAt: new Date().toISOString(),
        license: "ODbL",
      };
      cache.set(cacheKey, { at: Date.now(), data: result });
      return result;
    } catch (error) {
      console.error(`[overpass] ${endpoint} failed:`, error);
    }
  }

  return unavailable("Live OpenStreetMap services are unavailable right now.");
}
