import { z } from "zod";
import { categorySlugSchema, placeSchema } from "@/lib/data/schema";

export const plannerFormSchema = z.object({
  startPlaceSlug: z.string().min(1),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 09:30."),
  availableMinutes: z.coerce
    .number()
    .int()
    .min(60, "Plan at least one hour.")
    .max(720, "Keep the plan within 12 hours."),
  interests: z
    .array(categorySlugSchema)
    .min(1, "Pick at least one interest.")
    .max(8),
  budgetEnabled: z.boolean(),
  budgetLkr: z.coerce.number().min(0).max(1_000_000),
  travelMode: z.enum(["walk", "drive"]),
  pace: z.enum(["relaxed", "balanced", "fast"]),
  includeMeal: z.boolean(),
  accessibilityNeeded: z.boolean(),
  groupType: z.enum(["solo", "couple", "family", "friends"]),
  groupSize: z.coerce.number().int().min(1).max(20),
});

export type PlannerFormValues = z.output<typeof plannerFormSchema>;
export type PlannerFormInput = z.input<typeof plannerFormSchema>;

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(8)
    .optional(),
  near: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export const routeRequestSchema = z.object({
  origin: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  destination: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  mode: z.enum(["walk", "drive"]).default("walk"),
  waypoints: z
    .array(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }))
    .max(8)
    .optional(),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(100).max(3000).default(1200),
});

export const osmServicesQuerySchema = nearbyQuerySchema;

export const adminLoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export const favoriteRequestSchema = z.object({
  placeSlug: z.string().min(1).max(140),
});

export const savedItinerarySchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  itinerary: z.unknown(),
});

export const placeWriteSchema = placeSchema.omit({ images: true });

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type RouteRequest = z.infer<typeof routeRequestSchema>;
