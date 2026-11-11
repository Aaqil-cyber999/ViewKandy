import type { LatLng } from "@/types/place";

/**
 * Official Google Maps URL for opening Street View at a coordinate.
 *
 * A deep link is used instead of an embedded Street View image so the app does
 * not expose a billed API key in the browser or show an image that may not
 * exist for a given coordinate.
 */
export function streetViewUrl(point: LatLng): string {
  const lat = point.lat.toFixed(6);
  const lng = point.lng.toFixed(6);
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}
