import { TourCard } from "@/components/tours/tour-card";
import { PageIntro } from "@/components/ui/section";
import { seedTours } from "@/lib/data";
import { Film, MapPinned } from "lucide-react";

export const metadata = {
  title: "Virtual tours",
  description:
    "Cinematic camera tours over real Kandy coordinates: the lake, the temple, the ridges and the city's history.",
};

export default function ToursPage() {
  const totalStops = seedTours.reduce((sum, tour) => sum + tour.stops.length, 0);

  return (
    <>
      <PageIntro
        eyebrow="Virtual tours"
        title="See the shape of the city first"
        description="Each tour is a sequence of camera moves over real coordinates. Play it end to end, pause on a stop, or jump straight to the place details. The 3D massing is illustrative; the coordinates are not."
      >
        <div className="flex flex-wrap gap-4 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-accent" />
            {seedTours.length} tours
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPinned className="h-3.5 w-3.5 text-mint" />
            {totalStops} stops across the city
          </span>
        </div>
      </PageIntro>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seedTours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-line/70 bg-surface/40 p-5 text-[12px] leading-relaxed text-muted">
          <h2 className="text-sm font-semibold text-foreground">About the 3D</h2>
          <p className="mt-2">
            KandyVerse uses CesiumJS with an OpenStreetMap/CARTO base layer and
            custom, clearly illustrative landmark massing built from real
            coordinates. If a Google Maps Platform key is configured, the app
            attempts to load Google Photorealistic 3D Tiles; when tiles are
            unavailable for an area it falls back to the globe and massing rather
            than pretending a photorealistic view exists. WebGL failure switches
            to a 2D Leaflet map automatically.
          </p>
        </div>
      </div>
    </>
  );
}
