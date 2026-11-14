"use client";

import { Layers } from "lucide-react";
import type { Place, PlaceWithDistance } from "@/types/place";
import { FallbackMap } from "@/components/map/leaflet/fallback-map";
import { Badge } from "@/components/ui/badge";

export function PlaceMap({
  place,
  nearby,
}: {
  place: Place;
  nearby: PlaceWithDistance[];
}) {
  const places = [place, ...nearby];

  return (
    <div className="relative h-[360px] overflow-hidden border border-line bg-surface sm:h-[420px]">
      <FallbackMap
        places={places}
        selectedSlug={place.slug}
        center={{ lat: place.lat, lng: place.lng }}
        zoom={15}
        className="h-full w-full"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <Badge variant="neutral" className="border-line bg-surface/85 backdrop-blur">
          <Layers className="h-3 w-3 text-accent" />
          Live 2D map
        </Badge>
        <Badge variant="neutral" className="border-line bg-surface/85 backdrop-blur">
          {place.locationAccuracy === "rooftop"
            ? "Rooftop coordinate"
            : place.locationAccuracy === "approximate"
              ? "Approximate coordinate"
              : "District-level coordinate"}
        </Badge>
      </div>

      <p className="absolute bottom-2 left-3 right-3 text-[10px] leading-relaxed text-muted-2">
        Map data © OpenStreetMap contributors © CARTO. Coordinates are editorial
        records, not a photorealistic survey.
      </p>
    </div>
  );
}
