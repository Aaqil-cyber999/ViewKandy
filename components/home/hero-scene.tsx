"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Compass, Layers, Moon, RotateCcw, Sparkles, Sun, X } from "lucide-react";
import type { Place } from "@/types/place";
import { CesiumScene, type CesiumSceneHandle } from "@/components/map/cesium/cesium-scene";
import { FallbackMap } from "@/components/map/leaflet/fallback-map";
import { CategoryIcon } from "@/components/places/category-icon";
import { getCategory } from "@/lib/data";
import { cn } from "@/lib/utils/cn";

interface HeroSceneProps {
  places: Place[];
  placeCount: number;
  categoryCount: number;
  weatherLine: string;
}

export function HeroScene({ places, placeCount, categoryCount, weatherLine }: HeroSceneProps) {
  const sceneRef = useRef<CesiumSceneHandle>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [night, setNight] = useState(false);
  const [tileset, setTileset] = useState(false);

  const selectedPlace = places.find((place) => place.slug === selected) ?? null;
  const photoreal = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  function select(slug: string | null) {
    setSelected(slug);
    const place = places.find((item) => item.slug === slug);
    if (place) {
      sceneRef.current?.flyTo({
        lat: place.lat,
        lng: place.lng,
        range: 900,
        pitch: -32,
      });
    }
  }

  return (
    <section className="relative isolate overflow-hidden border-b border-line/60">
      <div className="absolute inset-0">
        {error ? (
          <FallbackMap
            places={places}
            selectedSlug={selected}
            onSelect={select}
            zoom={14}
            className="h-full w-full"
          />
        ) : (
          <CesiumScene
            ref={sceneRef}
            places={places}
            selectedSlug={selected}
            onSelect={select}
            mode="hero"
            autoOrbit
            onReady={() => setReady(true)}
            onError={(message) => setError(message)}
            onTileset={setTileset}
            className="h-full w-full"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink-950/80 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-end px-4 pb-10 pt-20 sm:px-6 lg:min-h-[680px] lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-900/70 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="kv-pulse-ring absolute inline-flex h-full w-full rounded-full bg-mint" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
            </span>
            Kandy, Sri Lanka · 7.2906° N, 80.6337° E
          </div>

          <h1 className="kv-display mt-5 text-5xl font-semibold text-white sm:text-6xl lg:text-7xl">
            Explore Kandy
            <br />
            <span className="bg-gradient-to-r from-accent via-sky-200 to-mint bg-clip-text text-transparent">
              beyond the map.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Fly over the lake and the hills, find places that actually exist, and
            turn a few free hours into a plan you can walk. No invented hours, no
            fake reviews, no stock photos pretending to be Kandy.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="kv-focus inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-ink-950 shadow-[0_14px_40px_-16px_rgba(56,189,248,0.9)] transition hover:bg-sky-300"
            >
              <Compass className="h-4 w-4" />
              Explore in 3D
            </Link>
            <Link
              href="/planner"
              className="kv-focus inline-flex h-12 items-center gap-2 rounded-full border border-line bg-ink-900/70 px-6 text-sm font-medium text-white backdrop-blur transition hover:bg-ink-700"
            >
              Plan my trip
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/assistant"
              className="kv-focus inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm text-slate-300 transition hover:text-white"
            >
              <Sparkles className="h-4 w-4 text-mint" />
              Ask the assistant
            </Link>
          </div>

          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-[11px] text-slate-400">
            <div>
              <dt className="kv-label">Places</dt>
              <dd className="mt-0.5 text-lg font-semibold text-white">{placeCount}</dd>
            </div>
            <div>
              <dt className="kv-label">Categories</dt>
              <dd className="mt-0.5 text-lg font-semibold text-white">{categoryCount}</dd>
            </div>
            <div>
              <dt className="kv-label">Weather now</dt>
              <dd className="mt-0.5 text-sm font-medium text-white">{weatherLine}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-900/70 px-3 py-1.5 text-[10px] text-slate-400 backdrop-blur">
              <Layers className="h-3 w-3 text-accent" />
              {tileset
                ? "Google Photorealistic 3D Tiles active"
                : photoreal
                  ? "3D tiles unavailable — globe + landmark massing"
                  : "OSM base map + illustrative 3D landmark massing"}
            </span>
            {!ready && !error && (
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-900/70 px-3 py-1.5 text-[10px] text-slate-400 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Loading 3D scene…
              </span>
            )}
            {error && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5 text-[10px] text-amber backdrop-blur">
                3D unavailable — showing the 2D map
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !night;
                setNight(next);
                sceneRef.current?.setNightMode(next);
              }}
              className="kv-focus inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-ink-900/70 px-3 text-[11px] text-slate-300 backdrop-blur transition hover:bg-ink-700"
            >
              {night ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {night ? "Day" : "Night"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                sceneRef.current?.reset();
              }}
              className="kv-focus inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-ink-900/70 px-3 text-[11px] text-slate-300 backdrop-blur transition hover:bg-ink-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset view
            </button>
          </div>
        </div>
      </div>

      {selectedPlace && (
        <div className="absolute bottom-6 right-4 z-20 w-[min(340px,calc(100%-2rem))] sm:right-6 lg:right-8">
          <div className="kv-panel rounded-2xl p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="kv-focus absolute right-3 top-3 rounded-full p-1 text-slate-500 hover:text-white"
              aria-label="Close place preview"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: getCategory(selectedPlace.category).color }}
            >
              <CategoryIcon name={getCategory(selectedPlace.category).icon} className="h-3 w-3" />
              {getCategory(selectedPlace.category).name}
            </p>
            <h2 className="mt-1.5 pr-6 text-base font-semibold text-white">
              {selectedPlace.name}
            </h2>
            <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-slate-400">
              {selectedPlace.summary}
            </p>
            <Link
              href={`/places/${selectedPlace.slug}`}
              className={cn(
                "kv-focus mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-sky-300",
              )}
            >
              Open place details
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
