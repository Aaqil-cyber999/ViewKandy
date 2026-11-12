"use client";

import { useState } from "react";
import { Camera, Footprints, Navigation, Route } from "lucide-react";
import type { Place } from "@/types/place";
import type { RouteResult } from "@/lib/maps/routes";
import { streetViewUrl } from "@/lib/maps/street-view";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";

export function PlaceRoutePanel({ place }: { place: Place }) {
  const { toast } = useToast();
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"walk" | "drive">("walk");

  async function buildRoute() {
    setLoading(true);
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: 7.2906, lng: 80.6337 },
          destination: { lat: place.lat, lng: place.lng },
          mode,
        }),
      });
      const data = (await response.json()) as RouteResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Route request failed.");
      setResult(data);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not build a route.", "info");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line/80 bg-surface/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <Route className="h-4 w-4 text-accent" />
          Route from Kandy city centre
        </h2>
        <div className="flex rounded-full border border-line p-0.5">
          {(["walk", "drive"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setResult(null);
              }}
              aria-pressed={mode === option}
              className={`kv-focus rounded-full px-2.5 py-1 text-[10px] capitalize ${
                mode === option ? "bg-accent text-white" : "text-muted"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-2">
        Uses the Google Routes API when a server key is configured; otherwise it
        shows a clearly labelled straight-line estimate.
      </p>

      {result && (
        <div className="mt-3 rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2 text-[12px] text-muted">
          <p className="font-medium text-foreground">
            {result.distanceLabel} · {result.durationLabel}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-2">
            {result.source === "google_routes"
              ? "Live route from Google Routes API"
              : "Estimate from straight-line distance"}
          </p>
          {result.warning && (
            <p className="mt-1 text-[10px] leading-relaxed text-amber/90">{result.warning}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={buildRoute} disabled={loading}>
          {mode === "walk" ? <Footprints className="h-3.5 w-3.5" /> : <Navigation className="h-3.5 w-3.5" />}
          {loading ? "Building route…" : "Build route"}
        </Button>
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=7.2906,80.6337&destination=${place.lat},${place.lng}&travelmode=${mode === "walk" ? "walking" : "driving"}`}
          target="_blank"
          rel="noreferrer"
          className="kv-focus inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12px] text-muted transition hover:bg-surface-2"
        >
          <Navigation className="h-3.5 w-3.5" />
          Open in Google Maps
        </a>
        <a
          href={streetViewUrl(place)}
          target="_blank"
          rel="noreferrer"
          className="kv-focus inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12px] text-muted transition hover:bg-surface-2"
        >
          <Camera className="h-3.5 w-3.5" />
          Street View
        </a>
      </div>
    </div>
  );
}
