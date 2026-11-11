import { desc, eq, inArray } from "drizzle-orm";
import type { Place, PlaceImage } from "@/types/place";
import { getDb } from "./client";
import { placeImages, places, verificationLogs, type PlaceRow } from "./schema";

/**
 * Typed catalogue access through Drizzle. This module is server-only: it is
 * imported from route handlers and server components, never from the browser.
 */

function rowToPlace(row: PlaceRow, images: PlaceImage[]): Place {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.categorySlug as Place["category"],
    summary: row.summary,
    description: row.description,
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: row.address,
    website: row.website,
    phone: row.phone,
    openingHours: row.openingHours,
    entryFeeLkr: row.entryFeeLkr === null ? null : Number(row.entryFeeLkr),
    estimatedVisitMinutes: row.estimatedVisitMinutes,
    accessibility: row.accessibility,
    tags: row.tags ?? [],
    indoor: row.indoor,
    bestTime: row.bestTime,
    practicalNotes: row.practicalNotes,
    verification: {
      status: row.verificationStatus as Place["verification"]["status"],
      source: row.verificationSource,
      sourceUrl: row.verificationSourceUrl,
      lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
    },
    locationAccuracy: row.locationAccuracy as Place["locationAccuracy"],
    featured: row.featured,
    priority: Number(row.priority),
    images,
  };
}

function placeToRow(place: Place) {
  return {
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
}

export async function listDrizzlePlaces(): Promise<Place[]> {
  const db = getDb();
  const rows = await db.select().from(places).orderBy(desc(places.priority), places.name);

  const imagesByPlace = new Map<string, PlaceImage[]>();
  if (rows.length > 0) {
    const images = await db
      .select()
      .from(placeImages)
      .where(
        inArray(
          placeImages.placeId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(placeImages.sortOrder);

    for (const image of images) {
      const list = imagesByPlace.get(image.placeId) ?? [];
      list.push({
        id: image.id,
        url: image.url,
        alt: image.alt,
        credit: image.credit,
        license: image.license,
      });
      imagesByPlace.set(image.placeId, list);
    }
  }

  return rows.map((row) => rowToPlace(row, imagesByPlace.get(row.id) ?? []));
}

export async function getDrizzlePlace(slug: string): Promise<Place | null> {
  const db = getDb();
  const [row] = await db.select().from(places).where(eq(places.slug, slug)).limit(1);
  if (!row) return null;

  const images = await db
    .select()
    .from(placeImages)
    .where(eq(placeImages.placeId, row.id))
    .orderBy(placeImages.sortOrder);

  return rowToPlace(
    row,
    images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      credit: image.credit,
      license: image.license,
    })),
  );
}

export async function upsertDrizzlePlace(place: Place): Promise<Place> {
  const db = getDb();
  const row = placeToRow(place);

  const [existing] = await db
    .select({
      verificationStatus: places.verificationStatus,
      verificationSource: places.verificationSource,
      verificationSourceUrl: places.verificationSourceUrl,
      lastVerifiedAt: places.lastVerifiedAt,
    })
    .from(places)
    .where(eq(places.id, place.id))
    .limit(1);

  const { id, ...updatable } = row;

  await db
    .insert(places)
    .values({ ...row, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: places.id,
      set: { ...updatable, updatedAt: new Date() },
    });

  const verificationChanged =
    !existing ||
    existing.verificationStatus !== place.verification.status ||
    existing.verificationSource !== place.verification.source ||
    existing.verificationSourceUrl !== place.verification.sourceUrl ||
    (existing.lastVerifiedAt?.toISOString() ?? null) !== place.verification.lastVerifiedAt;

  if (verificationChanged && (existing || place.verification.status !== "unverified")) {
    await db.insert(verificationLogs).values({
      placeId: place.id,
      previousStatus: existing?.verificationStatus ?? null,
      newStatus: place.verification.status,
      source: place.verification.source,
      sourceUrl: place.verification.sourceUrl,
      verifiedAt: place.verification.lastVerifiedAt
        ? new Date(place.verification.lastVerifiedAt)
        : null,
      actor: "editorial-admin",
    });
  }

  return place;
}

export async function deleteDrizzlePlace(id: string): Promise<boolean> {
  const db = getDb();
  const removed = await db.delete(places).where(eq(places.id, id)).returning({ id: places.id });
  return removed.length > 0;
}
