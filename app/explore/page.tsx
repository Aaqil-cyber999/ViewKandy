import { Suspense } from "react";
import { ExploreShell } from "@/components/explore/explore-shell";
import { PageIntro } from "@/components/ui/section";
import { listPlaces } from "@/lib/db";
import { seedCategories } from "@/lib/data";

export const metadata = {
  title: "Explore Kandy in 3D",
  description:
    "Search and filter every place in the KandyVerse database, inspect it on a 3D globe or a 2D map, and request a route.",
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
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-slate-400">
            Loading the explorer…
          </div>
        }
      >
        <ExploreShell places={places} categories={seedCategories} />
      </Suspense>
    </>
  );
}
