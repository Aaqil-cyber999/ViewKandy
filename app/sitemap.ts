import type { MetadataRoute } from "next";
import { listPlaces } from "@/lib/db";
import { seedTours } from "@/lib/data";
import { siteConfig } from "@/lib/config/site";

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/explore", priority: 0.9, changeFrequency: "weekly" },
  { path: "/places", priority: 0.9, changeFrequency: "weekly" },
  { path: "/planner", priority: 0.8, changeFrequency: "monthly" },
  { path: "/assistant", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tours", priority: 0.8, changeFrequency: "monthly" },
  { path: "/saved", priority: 0.4, changeFrequency: "monthly" },
  { path: "/auth", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const places = await listPlaces().catch(() => []);
  const placeEntries: MetadataRoute.Sitemap = places.map((place) => ({
    url: `${base}/places/${place.slug}`,
    lastModified: place.verification.lastVerifiedAt
      ? new Date(place.verification.lastVerifiedAt)
      : now,
    changeFrequency: "monthly",
    priority: place.featured ? 0.8 : 0.6,
  }));

  const tourEntries: MetadataRoute.Sitemap = seedTours.map((tour) => ({
    url: `${base}/tours/${tour.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${base}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...placeEntries,
    ...tourEntries,
  ];
}
