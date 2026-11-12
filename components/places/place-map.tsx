"use client";

import { useState } from "react";
import { Compass, Layers, Map as MapIcon } from "lucide-react";
import type { Place, PlaceWithDistance } from "@/types/place";
import { CesiumScene } from "@/components/map/cesium/cesium-scene";
import { FallbackMap } from "@/components/map/leaflet/fallback-map";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export function PlaceMap({
  place,
  nearby,
}: {
  place: Place;
  nearby: PlaceWithDistance[];
}) {
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [error, setError] = useState(false);
  const places = [place, ...nearby];

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-line/80 bg-surface sm:h-[420px]">
      {view === "3d" && !error ? (
        <CesiumScene
          places={places}
          selectedSlug={place.slug}
          mode="explore"
          labels={false}
          initialTarget={{ lat: place.lat, lng: place.lng, range: 700, pitch: -34 }}
          onError={() => {
            setError(true);
            setView("2d");
          }}
          className="h-full w-full"
        />
      ) : (
        <FallbackMap
          places={places}
          selectedSlug={place.slug}
          center={{ lat: place.lat, lng: place.lng }}
          zoom={15}
          className="h-full w-full"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/80 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setView("3d")}
            disabled={error}
            className={cn(
              "kv-focus inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] disabled:opacity-40",
              view === "3d" ? "bg-accent text-white" : "text-muted",
            )}
          >
            <Compass className="h-3 w-3" />
            3D
          </button>
          <button
            type="button"
            onClick={() => setView("2d")}
            className={cn(
              "kv-focus inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]",
              view === "2d" ? "bg-accent text-white" : "text-muted",
            )}
          >
            <MapIcon className="h-3 w-3" />
            2D
          </button>
        </div>
        <Badge variant="neutral" className="bg-surface/80 backdrop-blur">
          <Layers className="h-3 w-3 text-accent" />
          {place.locationAccuracy === "rooftop"
            ? "Rooftop coordinate"
            : place.locationAccuracy === "approximate"
              ? "Approximate coordinate"
              : "District-level coordinate"}
        </Badge>
      </div>

      <p className="absolute bottom-2 left-3 right-3 text-[9px] leading-relaxed text-muted-2">
        Map data © OpenStreetMap contributors © CARTO. 3D landmark massing is
        illustrative, not a photorealistic survey.
      </p>
    </div>
  );
}
