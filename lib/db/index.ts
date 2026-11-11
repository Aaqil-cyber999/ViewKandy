import type { Place } from "@/types/place";
import { seedPlaces } from "@/lib/data";
import { databaseConfigured } from "./client";
import {
  deleteDrizzlePlace,
  getDrizzlePlace,
  listDrizzlePlaces,
  upsertDrizzlePlace,
} from "./drizzle-store";
import {
  deleteLocalPlace,
  listLocalPlaces,
  localOverridesUpdatedAt,
  upsertLocalPlace,
} from "./local-store";

export type DataBackend = "postgres" | "local";

export function activeBackend(): DataBackend {
  return databaseConfigured() ? "postgres" : "local";
}

/**
 * Repository facade. Postgres (Drizzle) is authoritative when DATABASE_URL is
 * configured; if it is unreachable we degrade to the bundled seed dataset
 * rather than breaking exploration, and surface the degraded state through
 * `dataStatus()`.
 */
export async function listPlaces(): Promise<Place[]> {
  if (databaseConfigured()) {
    try {
      const rows = await listDrizzlePlaces();
      if (rows.length > 0) return rows;
    } catch (error) {
      console.error("[db] Postgres read failed, using local seed:", error);
    }
  }
  return listLocalPlaces();
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  if (databaseConfigured()) {
    try {
      const row = await getDrizzlePlace(slug);
      if (row) return row;
    } catch (error) {
      console.error("[db] Postgres lookup failed, using local seed:", error);
    }
  }
  const places = await listLocalPlaces();
  return places.find((p) => p.slug === slug) ?? null;
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const places = await listPlaces();
  return places.find((p) => p.id === id) ?? null;
}

export async function savePlace(place: Place): Promise<Place> {
  if (databaseConfigured()) return upsertDrizzlePlace(place);
  return upsertLocalPlace(place);
}

export async function removePlace(id: string): Promise<boolean> {
  if (databaseConfigured()) return deleteDrizzlePlace(id);
  return deleteLocalPlace(id);
}

export async function dataStatus() {
  const backend = activeBackend();
  let count = seedPlaces.length;
  let updatedAt: string | null = null;
  try {
    const places = await listPlaces();
    count = places.length;
    updatedAt = backend === "local" ? await localOverridesUpdatedAt() : null;
  } catch {
    // Keep seed count as a fallback.
  }
  return {
    backend,
    configured: backend === "postgres",
    placeCount: count,
    editorialUpdatedAt: updatedAt,
    degraded: backend === "postgres" && count === 0,
  };
}
