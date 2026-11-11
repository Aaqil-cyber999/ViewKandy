"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  Compass,
  Crosshair,
  Filter,
  Layers,
  ListFilter,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Route,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Category, CategorySlug, Place, PlaceWithDistance } from "@/types/place";
import type { RouteResult } from "@/lib/maps/routes";
import { searchPlaces } from "@/lib/db/search";
import { KANDY_CENTER } from "@/lib/geo/distance";
import { CesiumScene, type CesiumSceneHandle } from "@/components/map/cesium/cesium-scene";
import { FallbackMap } from "@/components/map/leaflet/fallback-map";
import { PlaceArt } from "@/components/places/place-art";
import { CategoryIcon } from "@/components/places/category-icon";
import { SaveButton, AddToTripButton } from "@/components/places/save-button";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/section";
import { useToast } from "@/components/providers/toast-provider";
import { formatDistance, formatDuration } from "@/lib/geo/distance";
import { cn } from "@/lib/utils/cn";

interface ExploreShellProps {
  places: Place[];
  categories: Category[];
}

type SortMode = "recommended" | "nearest" | "name";

export function ExploreShell({ places, categories }: ExploreShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const initialCategory = searchParams.get("category");
  const initialPlace = searchParams.get("place");
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<string | null>(initialPlace);
  const [activeCategories, setActiveCategories] = useState<CategorySlug[]>(
    initialCategory && categories.some((c) => c.slug === initialCategory)
      ? [initialCategory as CategorySlug]
      : [],
  );
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>("recommended");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const found = searchPlaces(places, {
      q: deferredQuery,
      categories: activeCategories.length ? activeCategories : undefined,
      near: near ?? undefined,
      maxDistanceMeters: near && radius ? radius : undefined,
      indoorOnly,
      featuredOnly,
      limit: 200,
    });
    if (sort === "nearest" && near) {
      return [...found].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    if (sort === "name") {
      return [...found].sort((a, b) => a.name.localeCompare(b.name));
    }
    return found;
  }, [places, deferredQuery, activeCategories, near, radius, indoorOnly, featuredOnly, sort]);

  const selectedPlace = results.find((p) => p.slug === selected)
    ?? places.find((p) => p.slug === selected)
    ?? null;
  const selectedDistanceMeters = near
    ? (results.find((place) => place.slug === selected)?.distanceMeters ?? null)
    : null;

  function syncUrl(next: {
    q?: string;
    category?: CategorySlug | null;
    place?: string | null;
  }) {
    const params = new URLSearchParams();
    const nextQuery = next.q ?? query;
    const nextCategory =
      next.category !== undefined ? next.category : activeCategories[0] ?? null;
    const nextPlace = next.place !== undefined ? next.place : selected;
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextCategory) params.set("category", nextCategory);
    if (nextPlace) params.set("place", nextPlace);
    const suffix = params.toString();
    router.replace(suffix ? `/explore?${suffix}` : "/explore", { scroll: false });
  }

  function toggleCategory(slug: CategorySlug) {
    const next = activeCategories.includes(slug)
      ? activeCategories.filter((item) => item !== slug)
      : [...activeCategories, slug];
    setActiveCategories(next);
    syncUrl({ category: next[0] ?? null });
  }

  function selectPlace(slug: string | null) {
    setSelected(slug);
    setRoute(null);
    syncUrl({ place: slug });
  }

  function locate() {
    if (!navigator.geolocation) {
      toast("This browser does not expose geolocation. Pick a place manually.", "info");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNear({ lat: position.coords.latitude, lng: position.coords.longitude });
        setSort("nearest");
        toast("Distances are now measured from your location.", "success");
      },
      () => {
        toast(
          "Location permission was denied. Distances stay relative to central Kandy.",
          "info",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }

  async function requestRoute() {
    if (!selectedPlace) return;
    setRouteLoading(true);
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: near ?? KANDY_CENTER,
          destination: { lat: selectedPlace.lat, lng: selectedPlace.lng },
          mode: "walk",
        }),
      });
      const data = (await response.json()) as RouteResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Route request failed.");
      setRoute(data);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not build a route.", "info");
    } finally {
      setRouteLoading(false);
    }
  }

  const activeFilterCount =
    activeCategories.length + (indoorOnly ? 1 : 0) + (featuredOnly ? 1 : 0) + (radius ? 1 : 0);

  return (
    <div className="mx-auto max-w-[1500px] px-3 pb-10 pt-4 sm:px-5 lg:px-6">
      <div className="grid gap-4 lg:grid-cols-[400px_1fr] lg:items-start">
        <div className="order-2 lg:order-1 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1">
          <div className="rounded-2xl border border-line/80 bg-ink-800/50 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  syncUrl({ q: event.target.value });
                }}
                placeholder="Search places, food, temples, services…"
                className="pl-9 pr-9"
                aria-label="Search places"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    syncUrl({ q: "" });
                  }}
                  className="kv-focus absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((value) => !value)}
                className={cn(
                  "kv-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12px] transition",
                  filtersOpen || activeFilterCount > 0
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-line text-slate-300 hover:bg-ink-700",
                )}
                aria-expanded={filtersOpen}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-ink-950">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={locate}
                className="kv-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-[12px] text-slate-300 transition hover:bg-ink-700"
              >
                <LocateFixed className={cn("h-3.5 w-3.5", near && "text-mint")} />
                {near ? "Using my location" : "Near me"}
              </button>
            </div>

            {filtersOpen && (
              <div className="mt-3 space-y-3 border-t border-line/70 pt-3">
                <div>
                  <p className="kv-label mb-2">Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((category) => {
                      const active = activeCategories.includes(category.slug);
                      return (
                        <button
                          key={category.slug}
                          type="button"
                          onClick={() => toggleCategory(category.slug)}
                          aria-pressed={active}
                          className={cn(
                            "kv-focus inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition",
                            active
                              ? "border-accent/40 bg-accent/10 text-accent"
                              : "border-line text-slate-400 hover:text-white",
                          )}
                        >
                          <CategoryIcon name={category.icon} className="h-3 w-3" />
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={indoorOnly}
                      onChange={(event) => setIndoorOnly(event.target.checked)}
                      className="accent-sky-400"
                    />
                    Indoor only
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={featuredOnly}
                      onChange={(event) => setFeaturedOnly(event.target.checked)}
                      className="accent-sky-400"
                    />
                    Editor&apos;s picks
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="kv-label mb-1.5">Within</p>
                    <Select
                      value={radius ?? ""}
                      onChange={(event) =>
                        setRadius(event.target.value ? Number(event.target.value) : null)
                      }
                      disabled={!near}
                      className="h-9 text-[12px]"
                      aria-label="Maximum distance"
                    >
                      <option value="">Any distance</option>
                      <option value="1000">1 km</option>
                      <option value="2000">2 km</option>
                      <option value="5000">5 km</option>
                      <option value="10000">10 km</option>
                    </Select>
                  </div>
                  <div>
                    <p className="kv-label mb-1.5">Sort</p>
                    <Select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as SortMode)}
                      className="h-9 text-[12px]"
                      aria-label="Sort results"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="nearest" disabled={!near}>
                        Nearest
                      </option>
                      <option value="name">Name</option>
                    </Select>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategories([]);
                      setIndoorOnly(false);
                      setFeaturedOnly(false);
                      setRadius(null);
                      syncUrl({ category: null });
                    }}
                    className="kv-focus text-[11px] text-slate-400 underline-offset-2 hover:text-white hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-slate-500">
            <span>
              {results.length} {results.length === 1 ? "place" : "places"}
              {near ? " near you" : " in Kandy"}
            </span>
            {near && (
              <button
                type="button"
                onClick={() => {
                  setNear(null);
                  setRadius(null);
                  setSort("recommended");
                }}
                className="kv-focus inline-flex items-center gap-1 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
                Clear location
              </button>
            )}
          </div>

          <div className="mt-2 space-y-2">
            {results.length === 0 ? (
              <EmptyState
                title="No places match those filters"
                description="Try a broader search, remove a category, or clear the distance limit. The explorer only shows places in the KandyVerse database."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setActiveCategories([]);
                      setIndoorOnly(false);
                      setFeaturedOnly(false);
                      setRadius(null);
                      syncUrl({ q: "", category: null });
                    }}
                  >
                    Reset filters
                  </Button>
                }
              />
            ) : (
              results.map((place) => (
                <ResultRow
                  key={place.slug}
                  place={place}
                  active={place.slug === selected}
                  showDistance={Boolean(near)}
                  onSelect={() => selectPlace(place.slug)}
                />
              ))
            )}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="sticky top-16 overflow-hidden rounded-2xl border border-line/80 bg-ink-900">
            <div className="relative h-[48vh] min-h-[320px] lg:h-[calc(100dvh-6rem)]">
              {view === "3d" && !sceneError ? (
                <CesiumScene
                  places={results}
                  selectedSlug={selected}
                  onSelect={selectPlace}
                  mode="explore"
                  labels
                  route={route?.polyline ?? null}
                  onError={(message) => {
                    setSceneError(message);
                    setView("2d");
                  }}
                  className="h-full w-full"
                />
              ) : (
                <FallbackMap
                  places={results}
                  selectedSlug={selected}
                  onSelect={selectPlace}
                  route={route?.polyline ?? null}
                  center={
                    selectedPlace
                      ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
                      : KANDY_CENTER
                  }
                  zoom={14}
                  className="h-full w-full"
                />
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
                <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-ink-950/80 p-1 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setView("3d")}
                    disabled={Boolean(sceneError)}
                    className={cn(
                      "kv-focus inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition disabled:opacity-40",
                      view === "3d" ? "bg-accent text-ink-950" : "text-slate-300",
                    )}
                  >
                    <Compass className="h-3 w-3" />
                    3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("2d")}
                    className={cn(
                      "kv-focus inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition",
                      view === "2d" ? "bg-accent text-ink-950" : "text-slate-300",
                    )}
                  >
                    <MapIcon className="h-3 w-3" />
                    2D
                  </button>
                </div>

                <div className="pointer-events-auto flex items-center gap-1.5">
                  <Badge variant="neutral" className="border-white/10 bg-ink-950/80 backdrop-blur">
                    <Layers className="h-3 w-3 text-accent" />
                    {view === "3d" ? "Cesium" : "Leaflet"} · OSM
                  </Badge>
                  {sceneError && (
                    <Badge variant="amber" className="bg-ink-950/80 backdrop-blur">
                      3D unavailable
                    </Badge>
                  )}
                </div>
              </div>

              {selectedPlace && (
                <div className="absolute inset-x-3 bottom-3 z-20 sm:left-auto sm:w-[340px]">
                  <div className="kv-panel rounded-2xl p-3.5 shadow-2xl">
                    <div className="flex gap-3">
                      <PlaceArt
                        slug={selectedPlace.slug}
                        category={selectedPlace.category}
                        className="h-16 w-16 shrink-0 rounded-lg"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="text-sm font-semibold leading-tight text-white">
                            {selectedPlace.name}
                          </h2>
                          <button
                            type="button"
                            onClick={() => selectPlace(null)}
                            className="kv-focus rounded p-0.5 text-slate-500 hover:text-white"
                            aria-label="Close preview"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                          {selectedPlace.summary}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                          <VerificationBadge status={selectedPlace.verification.status} />
                          {near && selectedDistanceMeters !== null && (
                            <span>{formatDistance(selectedDistanceMeters)} away</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {route && (
                      <div className="mt-2.5 rounded-lg border border-accent/20 bg-accent/[0.06] px-2.5 py-2 text-[11px] text-slate-300">
                        <span className="font-medium text-white">
                          {route.distanceLabel} · {route.durationLabel}
                        </span>{" "}
                        <span className="text-slate-500">
                          ({route.source === "google_routes" ? "live route" : "estimate"})
                        </span>
                        {route.warning && (
                          <p className="mt-1 text-[10px] leading-relaxed text-amber/90">
                            {route.warning}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/places/${selectedPlace.slug}`}
                        className="kv-focus inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-[11px] font-semibold text-ink-950 hover:bg-sky-300"
                      >
                        Details
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-[11px]"
                        onClick={requestRoute}
                        disabled={routeLoading}
                      >
                        <Navigation className="h-3 w-3" />
                        {routeLoading ? "Routing…" : "Route here"}
                      </Button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="kv-focus inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-[11px] text-slate-300 hover:bg-ink-700"
                      >
                        <MapPin className="h-3 w-3" />
                        Maps
                      </a>
                      <span className="ml-auto">
                        <SaveButton slug={selectedPlace.slug} name={selectedPlace.name} />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!selectedPlace && (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                  <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-950/80 px-3 py-1.5 text-[10px] text-slate-400 backdrop-blur">
                    <Crosshair className="h-3 w-3 text-accent" />
                    Select a marker or a result to inspect it
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  place,
  active,
  showDistance,
  onSelect,
}: {
  place: PlaceWithDistance;
  active: boolean;
  showDistance: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex gap-3 rounded-xl border p-2.5 transition",
        active
          ? "border-accent/50 bg-accent/[0.06]"
          : "border-line/70 bg-ink-800/40 hover:border-slate-600 hover:bg-ink-700/40",
      )}
    >
      <button type="button" onClick={onSelect} className="kv-focus shrink-0" aria-label={`Show ${place.name} on the map`}>
        <PlaceArt
          slug={place.slug}
          category={place.category}
          className="h-20 w-20 rounded-lg"
        />
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onSelect} className="kv-focus block w-full text-left">
          <h3 className="truncate text-[13px] font-semibold text-white">{place.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
            {place.summary}
          </p>
        </button>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CategoryIcon
              name={categoriesFor(place.category)}
              className="h-3 w-3"
            />
            {place.category}
          </span>
          <span>{formatDuration(place.estimatedVisitMinutes)} est.</span>
          {showDistance && Number.isFinite(place.distanceMeters) && (
            <span className="text-slate-400">{formatDistance(place.distanceMeters)}</span>
          )}
          {place.indoor && <span>indoor</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-1">
        <SaveButton slug={place.slug} name={place.name} />
        <Link
          href={`/places/${place.slug}`}
          className="kv-focus inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-accent"
        >
          Details
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function categoriesFor(category: CategorySlug): string {
  const icons: Record<string, string> = {
    heritage: "landmark",
    religious: "flame",
    nature: "trees",
    viewpoint: "mountain",
    museum: "building",
    experience: "ticket",
    food: "utensils",
    hotel: "bed",
    shopping: "bag",
    transport: "train",
    health: "cross",
    services: "info",
  };
  return icons[category] ?? "info";
}
