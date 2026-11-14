import { Suspense } from "react";
import { ExploreShell } from "@/components/explore/explore-shell";
import { PageIntro } from "@/components/ui/section";
import { listPlaces } from "@/lib/db";
import { seedCategories } from "@/lib/data";

const quickFacts = [
  { label: "Map views", value: "3D + 2D" },
  { label: "Live route", value: "Real-time" },
  { label: "Filters", value: "Category + time" },
];

export const metadata = {
  title: "Explore Kandy in 3D",
  description:
    "Search and filter every place in the View Kandy database, inspect it on a 3D globe or a 2D map, and request a route.",
};

export default async function ExplorePage() {
  const places = await listPlaces();

  return (
    <>
      <PageIntro
        eyebrow="3D explorer"
        title="Every place, one map"
        description="Search the database, filter by what you need, and switch between the 3D globe and a fast 2D map. The 3D scene uses real coordinates with an OSM base map and illustrative landmark massing; photorealistic tiles are used only when a Google Maps key is configured."
      />

      <section
        id="quick-facts"
        data-scroll-section
        data-scroll-label="Quick facts"
        className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6 lg:px-8"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {quickFacts.map((item) => (
            <div key={item.label} className="kv-metric-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{item.label}</p>
              <p className="mt-3 font-display text-3xl text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <Suspense
        fallback={
          <section
            id="map"
            data-scroll-section
            data-scroll-label="Map"
            className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted"
          >
            Loading the explorer…
          </section>
        }
      >
        <section
          id="map"
          data-scroll-section
          data-scroll-label="Map"
        >
          <ExploreShell places={places} categories={seedCategories} />
        </section>
      </Suspense>
    </>
  );
}
