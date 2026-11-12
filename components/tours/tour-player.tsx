"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Map as MapIcon,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import type { Place } from "@/types/place";
import type { Tour, TourStop } from "@/types/tour";
import { CesiumScene, type CesiumSceneHandle } from "@/components/map/cesium/cesium-scene";
import { FallbackMap } from "@/components/map/leaflet/fallback-map";
import { PlaceArt } from "@/components/places/place-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/geo/distance";
import { cn } from "@/lib/utils/cn";

export interface ResolvedStop {
  stop: TourStop;
  place: Place;
}

export function TourPlayer({ tour, stops }: { tour: Tour; stops: ResolvedStop[] }) {
  const sceneRef = useRef<CesiumSceneHandle>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [caption, setCaption] = useState(true);

  const current = stops[index];
  const totalSeconds = useMemo(
    () => stops.reduce((sum, item) => sum + item.stop.dwellSeconds, 0),
    [stops],
  );
  const beforeSeconds = useMemo(
    () => stops.slice(0, index).reduce((sum, item) => sum + item.stop.dwellSeconds, 0),
    [stops, index],
  );
  const overall = Math.min(1, (beforeSeconds + elapsed) / Math.max(1, totalSeconds));

  const flyToStop = useCallback(
    (nextIndex: number) => {
      const item = stops[nextIndex];
      if (!item) return;
      sceneRef.current?.flyTo({
        lat: item.place.lat,
        lng: item.place.lng,
        range: item.stop.range,
        pitch: item.stop.pitch,
      });
    },
    [stops],
  );

  useEffect(() => {
    if (ready) flyToStop(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, index]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 0.1), 100);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!playing || !current) return;
    if (elapsed < current.stop.dwellSeconds) return;
    if (index < stops.length - 1) {
      setIndex((value) => value + 1);
      setElapsed(0);
    } else {
      setPlaying(false);
      setElapsed(current.stop.dwellSeconds);
    }
  }, [elapsed, playing, current, index, stops.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === " " || event.key === "k") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(Math.min(stops.length - 1, index + 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(Math.max(0, index - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, stops.length]);

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setElapsed(0);
    flyToStop(nextIndex);
  }

  function toggle() {
    if (!playing && index === stops.length - 1 && elapsed >= (current?.stop.dwellSeconds ?? 0)) {
      setIndex(0);
      setElapsed(0);
    }
    setPlaying((value) => !value);
  }

  function restart() {
    setIndex(0);
    setElapsed(0);
    setPlaying(true);
    flyToStop(0);
  }

  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-line/80 bg-surface">
      <div className="relative h-[52vh] min-h-[360px] lg:h-[62vh]">
        {view === "3d" && !mapError ? (
          <CesiumScene
            ref={sceneRef}
            places={stops.map((item) => item.place)}
            selectedSlug={current.place.slug}
            mode="tour"
            labels={false}
            initialTarget={{
              lat: current.place.lat,
              lng: current.place.lng,
              range: current.stop.range,
              pitch: current.stop.pitch,
            }}
            onReady={() => setReady(true)}
            onError={() => {
              setMapError(true);
              setView("2d");
            }}
            className="h-full w-full"
          />
        ) : (
          <FallbackMap
            places={stops.map((item) => item.place)}
            selectedSlug={current.place.slug}
            center={{ lat: current.place.lat, lng: current.place.lng }}
            zoom={15}
            className="h-full w-full"
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas/80 via-transparent to-canvas/40" />

        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-line bg-surface/80 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setView("3d")}
            disabled={mapError}
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

        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <Badge variant="neutral" className="bg-surface/80 backdrop-blur">
            <Film className="h-3 w-3 text-accent" />
            Stop {index + 1} / {stops.length}
          </Badge>
          {mapError && (
            <Badge variant="amber" className="bg-surface/80 backdrop-blur">
              2D fallback
            </Badge>
          )}
        </div>

        {!playing && elapsed === 0 && index === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <button
              type="button"
              onClick={toggle}
              className="kv-focus group grid h-20 w-20 place-items-center rounded-full border border-line bg-surface/70 text-foreground backdrop-blur transition hover:scale-105 hover:bg-accent hover:text-white"
              aria-label="Play virtual tour"
            >
              <Play className="ml-1 h-8 w-8" />
            </button>
          </div>
        )}

        {caption && (
          <div className="absolute inset-x-3 bottom-3 sm:inset-x-4">
            <div className="kv-panel rounded-2xl p-3.5 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="kv-label">{current.stop.headline}</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {current.place.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCaption(false)}
                  className="kv-focus text-[10px] text-muted-2 hover:text-foreground"
                >
                  Hide caption
                </button>
              </div>
              <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted">
                {current.stop.note}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link
                  href={`/places/${current.place.slug}`}
                  className="kv-focus inline-flex items-center gap-1 text-[11px] text-accent hover:text-emerald-700"
                >
                  Open place details
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <span className="text-[10px] text-muted-2">
                  {current.place.summary}
                </span>
              </div>
            </div>
          </div>
        )}
        {!caption && (
          <button
            type="button"
            onClick={() => setCaption(true)}
            className="kv-focus absolute bottom-4 left-4 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-[10px] text-muted backdrop-blur"
          >
            <Volume2 className="mr-1 inline h-3 w-3" />
            Show caption
          </button>
        )}
      </div>

      <div className="border-t border-line/70 p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo(Math.max(0, index - 1))}
            disabled={index === 0}
            className="kv-focus grid h-9 w-9 place-items-center rounded-full border border-line text-muted disabled:opacity-30"
            aria-label="Previous stop"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggle}
            className="kv-focus grid h-11 w-11 place-items-center rounded-full bg-accent text-white transition hover:bg-emerald-700"
            aria-label={playing ? "Pause tour" : "Play tour"}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.min(stops.length - 1, index + 1))}
            disabled={index === stops.length - 1}
            className="kv-focus grid h-9 w-9 place-items-center rounded-full border border-line text-muted disabled:opacity-30"
            aria-label="Next stop"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-mint transition-[width] duration-100"
                style={{ width: `${overall * 100}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-muted-2">
              <span>{Math.round(overall * totalSeconds)}s / {totalSeconds}s</span>
              <span>{formatDuration(totalSeconds / 60)} total</span>
            </div>
          </div>

          <button
            type="button"
            onClick={restart}
            className="kv-focus hidden h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[11px] text-muted sm:inline-flex"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </button>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {stops.map((item, stopIndex) => (
            <button
              key={item.place.slug}
              type="button"
              onClick={() => goTo(stopIndex)}
              aria-current={stopIndex === index ? "step" : undefined}
              className={cn(
                "kv-focus flex shrink-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition",
                stopIndex === index
                  ? "border-accent/40 bg-accent/10"
                  : "border-line/70 hover:bg-surface",
              )}
            >
              <PlaceArt
                slug={item.place.slug}
                category={item.place.category}
                className="h-7 w-7 rounded"
              />
              <span className="max-w-[120px] truncate text-[10px] text-muted">
                {item.stop.headline}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="border-t border-line/70 px-4 py-2 text-[9px] text-muted-2">
        Camera routes use real coordinates. 3D landmark massing is illustrative;
        photorealistic tiles appear only when a Google Maps key is configured.
        Space toggles playback, arrow keys step between stops.
      </p>
    </div>
  );
}
