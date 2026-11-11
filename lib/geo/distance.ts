import bearing from "@turf/bearing";
import distance from "@turf/distance";
import type { LatLng } from "@/types/place";

export const KANDY_CENTER: LatLng = { lat: 7.2906, lng: 80.6337 };
export const KANDY_BOUNDS = {
  south: 7.23,
  west: 80.55,
  north: 7.36,
  east: 80.68,
};

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  return distance([a.lng, a.lat], [b.lng, b.lat], { units: "kilometers" }) * 1000;
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  return bearing([a.lng, a.lat], [b.lng, b.lat]);
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 950) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} km`;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function formatMinutesAsTime(minutesFromMidnight: number): string {
  const normalized = ((Math.round(minutesFromMidnight) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function isInsideKandy(lat: number, lng: number): boolean {
  return (
    lat >= KANDY_BOUNDS.south &&
    lat <= KANDY_BOUNDS.north &&
    lng >= KANDY_BOUNDS.west &&
    lng <= KANDY_BOUNDS.east
  );
}

/** Bounding box padded around a centre, used for viewport queries. */
export function bboxAround(center: LatLng, radiusMeters: number) {
  const latDelta = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const lngDelta =
    latDelta / Math.max(0.01, Math.cos((center.lat * Math.PI) / 180));
  return {
    south: center.lat - latDelta,
    north: center.lat + latDelta,
    west: center.lng - lngDelta,
    east: center.lng + lngDelta,
  };
}

/** Point at a fraction of the way between two coordinates (linear, fine at city scale). */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}
