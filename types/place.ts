export type CategorySlug =
  | "heritage"
  | "religious"
  | "nature"
  | "viewpoint"
  | "museum"
  | "experience"
  | "food"
  | "hotel"
  | "shopping"
  | "transport"
  | "health"
  | "services";

export type VerificationStatus = "verified" | "partially_verified" | "unverified";
export type LocationAccuracy = "rooftop" | "approximate" | "district";

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  description: string;
  color: string;
  icon: string;
  order: number;
}

export interface PlaceVerification {
  status: VerificationStatus;
  source: string;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
}

export interface Place {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  summary: string;
  description: string;
  lat: number;
  lng: number;
  address: string | null;
  website: string | null;
  phone: string | null;
  openingHours: string | null;
  entryFeeLkr: number | null;
  estimatedVisitMinutes: number;
  accessibility: string | null;
  tags: string[];
  indoor: boolean;
  bestTime: string | null;
  practicalNotes: string | null;
  verification: PlaceVerification;
  locationAccuracy: LocationAccuracy;
  featured: boolean;
  priority: number;
  /** Populated from admin uploads or licensed media; never invented. */
  images?: PlaceImage[];
}

export interface PlaceImage {
  id: string;
  url: string;
  alt: string;
  credit: string | null;
  license: string | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceWithDistance extends Place {
  distanceMeters: number;
}
