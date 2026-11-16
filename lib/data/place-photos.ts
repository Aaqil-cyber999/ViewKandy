import photosJson from "@/data/seed/place-photos.json";
import type { PlaceImage } from "@/types/place";

/**
 * Local Kandy photography supplied for the View Kandy project. These are real
 * photographs of the destinations (not stock stand-ins), stored under
 * /public/places and served through the Next.js image pipeline.
 *
 * Each file is mapped to exactly one place slug. Where an image is missing the
 * generative PlaceArt plate stays in place, so we never substitute an unrelated
 * photo for a destination.
 *
 * The same JSON manifest drives `npm run images:upload`, which mirrors the
 * assets to the Supabase `place-images` bucket and records `place_images` rows.
 */
export interface LocalPlacePhoto {
  slug: string;
  file: string;
  alt: string;
}

const placePhotos = photosJson as LocalPlacePhoto[];

const placePhotoBySlug = new Map(
  placePhotos.map((photo) => [photo.slug, photo] as const),
);

export function listLocalPlacePhotos(): LocalPlacePhoto[] {
  return placePhotos;
}

export function getLocalPlacePhoto(slug: string): PlaceImage | null {
  const photo = placePhotoBySlug.get(slug);
  if (!photo) return null;

  return {
    id: `local-${slug}`,
    url: `/places/${photo.file}`,
    alt: photo.alt,
    // These are project-supplied assets. We deliberately do not invent a
    // third-party credit or licence for them.
    credit: null,
    license: null,
  };
}

/** Prefer a database-provided image, then the bundled local photograph. */
export function resolvePlacePhoto(
  slug: string,
  images?: PlaceImage[] | null,
): PlaceImage | null {
  return images?.[0] ?? getLocalPlacePhoto(slug);
}

export function hasLocalPlacePhoto(slug: string): boolean {
  return placePhotoBySlug.has(slug);
}
