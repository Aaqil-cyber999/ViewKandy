import { z } from "zod";

export const categorySlugSchema = z.enum([
  "heritage",
  "religious",
  "nature",
  "viewpoint",
  "museum",
  "experience",
  "food",
  "hotel",
  "shopping",
  "transport",
  "health",
  "services",
]);

export const categorySchema = z.object({
  id: z.string(),
  slug: categorySlugSchema,
  name: z.string(),
  description: z.string(),
  color: z.string(),
  icon: z.string(),
  order: z.number().int(),
});

export const placeVerificationSchema = z.object({
  status: z.enum(["verified", "partially_verified", "unverified"]),
  source: z.string(),
  sourceUrl: z.string().url().nullable(),
  lastVerifiedAt: z.string().nullable(),
});

export const placeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  category: categorySlugSchema,
  summary: z.string(),
  description: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().nullable(),
  website: z.string().url().nullable(),
  phone: z.string().nullable(),
  openingHours: z.string().nullable(),
  entryFeeLkr: z.number().nonnegative().nullable(),
  estimatedVisitMinutes: z.number().int().positive(),
  accessibility: z.string().nullable(),
  tags: z.array(z.string()),
  indoor: z.boolean(),
  bestTime: z.string().nullable(),
  practicalNotes: z.string().nullable(),
  verification: placeVerificationSchema,
  locationAccuracy: z.enum(["rooftop", "approximate", "district"]),
  featured: z.boolean(),
  priority: z.number(),
  images: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        alt: z.string(),
        credit: z.string().nullable(),
        license: z.string().nullable(),
      }),
    )
    .optional(),
});

export const tourStopSchema = z.object({
  placeSlug: z.string(),
  dwellSeconds: z.number().int().positive(),
  range: z.number().positive(),
  pitch: z.number(),
  headline: z.string(),
  note: z.string(),
});

export const tourSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  theme: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  durationSeconds: z.number().int().positive(),
  coverTone: z.string(),
  stops: z.array(tourStopSchema).min(1),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type PlaceInput = z.infer<typeof placeSchema>;
export type TourInput = z.infer<typeof tourSchema>;
