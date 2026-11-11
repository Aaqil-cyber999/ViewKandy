"use client";

import { useState } from "react";
import {
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Star,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/geo/distance";
import type { GooglePlacesResult } from "@/lib/maps/google-places";
import type { OsmServicesResult } from "@/lib/maps/overpass";
import type { Place } from "@/types/place";

function requestError(body: { warning?: string; error?: string } | null): string {
  return body?.warning ?? body?.error ?? "The live service did not respond.";
}

export function LiveGooglePlaces({
  place,
  enabled,
}: {
  place: Place;
  enabled: boolean;
}) {
  const [result, setResult] = useState<GooglePlacesResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!enabled) return null;

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/nearby?lat=${place.lat}&lng=${place.lng}&radius=1200`,
        { headers: { Accept: "application/json" } },
      );
      const body = (await response.json().catch(() => null)) as
        | (GooglePlacesResult & { error?: string })
        | null;
      if (!response.ok && !body?.warning) {
        throw new Error(requestError(body));
      }
      setResult(body ?? { source: "unavailable", places: [] });
    } catch (error) {
      setResult({
        source: "unavailable",
        places: [],
        warning:
          error instanceof Error
            ? error.message
            : "Live Google Places data is unavailable right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line/80 bg-ink-900/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-white">
          <MapPin className="h-4 w-4 text-accent" />
          Live places from Google
        </h2>
        <Badge variant="outline">External data</Badge>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Optional live enrichment from Google Places. These listings are not
        KandyVerse editorial records and are not verified by us.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : result ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          {loading ? "Loading Google data…" : result ? "Refresh" : "Find nearby places"}
        </Button>
      </div>

      <div aria-live="polite">
        {result?.warning && (
          <p className="mt-3 rounded-lg border border-amber/20 bg-amber/[0.05] p-2.5 text-[11px] leading-relaxed text-amber/90">
            {result.warning}
          </p>
        )}

        {result && !result.warning && result.places.length === 0 && (
          <p className="mt-3 text-[11px] text-slate-500">
            Google returned no places within 1.2 km for the selected types.
          </p>
        )}

        {result && result.places.length > 0 && (
          <ul className="mt-3 space-y-2">
            {result.places.map((item) => (
              <li key={item.id}>
                <a
                  href={
                    item.googleMapsUri ??
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="kv-focus block rounded-lg border border-line/60 bg-ink-800/40 p-2.5 transition hover:border-slate-600"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[12px] font-medium text-white">{item.name}</span>
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    {formatDistance(item.distanceMeters)}
                    {item.address ? ` · ${item.address}` : ""}
                  </span>
                  {(item.rating !== null || item.openNow !== null) && (
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      {item.rating !== null && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber text-amber" />
                          {item.rating.toFixed(1)}
                          {item.userRatingCount !== null
                            ? ` (${item.userRatingCount.toLocaleString("en-LK")})`
                            : ""}
                        </span>
                      )}
                      {item.openNow !== null && (
                        <span className={item.openNow ? "text-mint" : "text-slate-500"}>
                          {item.openNow ? "Open now" : "Closed now"}
                        </span>
                      )}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[9px] leading-relaxed text-slate-600">
        Data from Google Places, shown with attribution. Ratings and opening
        states are live Google values, not KandyVerse verification.
      </p>
    </div>
  );
}

export function OsmServices({ place }: { place: Place }) {
  const [result, setResult] = useState<OsmServicesResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/osm-services?lat=${place.lat}&lng=${place.lng}&radius=1200`,
        { headers: { Accept: "application/json" } },
      );
      const body = (await response.json().catch(() => null)) as
        | (OsmServicesResult & { error?: string })
        | null;
      if (!response.ok && !body?.warning) {
        throw new Error(requestError(body));
      }
      setResult(body ?? { source: "unavailable", services: [] });
    } catch (error) {
      setResult({
        source: "unavailable",
        services: [],
        warning:
          error instanceof Error
            ? error.message
            : "Live OpenStreetMap services are unavailable right now.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line/80 bg-ink-900/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-white">
          <Store className="h-4 w-4 text-mint" />
          Live services from OpenStreetMap
        </h2>
        <Badge variant="outline">External data</Badge>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Community-maintained ATMs, pharmacies, toilets and other practical
        services within 1.2 km. Not verified by KandyVerse.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : result ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Store className="h-3.5 w-3.5" />
          )}
          {loading ? "Querying Overpass…" : result ? "Refresh" : "Find nearby services"}
        </Button>
      </div>

      <div aria-live="polite">
        {result?.warning && (
          <p className="mt-3 rounded-lg border border-amber/20 bg-amber/[0.05] p-2.5 text-[11px] leading-relaxed text-amber/90">
            {result.warning}
          </p>
        )}

        {result && !result.warning && result.services.length === 0 && (
          <p className="mt-3 text-[11px] text-slate-500">
            No matching OpenStreetMap services were returned within 1.2 km.
          </p>
        )}

        {result && result.services.length > 0 && (
          <ul className="mt-3 space-y-2">
            {result.services.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-line/60 bg-ink-800/40 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={item.osmUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="kv-focus inline-flex items-center gap-1 text-[12px] font-medium text-white hover:text-accent"
                    >
                      {item.name}
                      <ExternalLink className="h-3 w-3 text-slate-600" />
                    </a>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {item.category} · {formatDistance(item.distanceMeters)}
                      {item.address ? ` · ${item.address}` : ""}
                    </p>
                    {item.openingHours && (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        OSM hours tag: <span className="text-slate-400">{item.openingHours}</span>
                      </p>
                    )}
                    {(item.phone || item.website) && (
                      <p className="mt-0.5 flex flex-wrap gap-2 text-[10px]">
                        {item.phone && (
                          <a href={`tel:${item.phone}`} className="text-accent hover:text-sky-300">
                            {item.phone}
                          </a>
                        )}
                        {item.website && (
                          <a
                            href={item.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:text-sky-300"
                          >
                            Website
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[9px] leading-relaxed text-slate-600">
        © OpenStreetMap contributors · ODbL. Live external data, not KandyVerse
        verification.
      </p>
    </div>
  );
}
