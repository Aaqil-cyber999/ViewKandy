"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarPlus,
  Check,
  ClipboardCopy,
  Clock,
  Compass,
  Footprints,
  Info,
  Map as MapIcon,
  Navigation,
  Pin,
  Route,
  Save,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import type { Category, CategorySlug, Place } from "@/types/place";
import type { Itinerary, ItineraryStop, PlannerPreferences } from "@/lib/planner/types";
import { generateItinerary } from "@/lib/planner/itinerary-generator";
import { estimateTravel } from "@/lib/planner/route-optimizer";
import { budgetStatus, summariseBudget } from "@/lib/planner/budget";
import { isOpenAt, parseOpeningHours } from "@/lib/planner/time-window";
import { downloadItineraryIcs, itineraryToMarkdown } from "@/lib/planner/export";
import { formatDistance, formatDuration, formatMinutesAsTime, parseTimeToMinutes, KANDY_CENTER } from "@/lib/geo/distance";
import {
  plannerFormSchema,
  type PlannerFormInput,
  type PlannerFormValues,
} from "@/lib/validation/schemas";
import type { RouteResult } from "@/lib/maps/routes";
import { CesiumScene } from "@/components/map/cesium/cesium-scene";
import { FallbackMap } from "@/components/map/leaflet/fallback-map";
import { PlaceArt } from "@/components/places/place-art";
import { CategoryIcon } from "@/components/places/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldHint, Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/section";
import { useToast } from "@/components/providers/toast-provider";
import { useSavedStore } from "@/lib/store/use-saved-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils/cn";

const DEFAULT_VALUES: PlannerFormValues = {
  startPlaceSlug: "city-centre",
  startTime: "09:00",
  availableMinutes: 240,
  interests: ["heritage", "religious", "nature"],
  budgetEnabled: false,
  budgetLkr: 6000,
  travelMode: "walk",
  pace: "balanced",
  includeMeal: true,
  accessibilityNeeded: false,
  groupType: "solo",
  groupSize: 1,
};

const DURATIONS = [120, 180, 240, 300, 360, 480];
const PACE_LABELS = { relaxed: "Relaxed", balanced: "Balanced", fast: "Fast" } as const;
const GROUP_LABELS = {
  solo: "Solo",
  couple: "Couple",
  family: "Family",
  friends: "Friends",
} as const;

interface PlannerClientProps {
  places: Place[];
  categories: Category[];
  weather: {
    rainLikely: boolean;
    headline: string;
    indoorAdvice: string;
    outdoorAdvice: string;
  } | null;
}

export function PlannerClient({ places, categories, weather }: PlannerClientProps) {
  const { toast } = useToast();
  const hydrated = useHydrated();
  const pins = useSavedStore((state) => state.pins);
  const togglePin = useSavedStore((state) => state.togglePin);
  const saveItinerary = useSavedStore((state) => state.saveItinerary);
  const itineraries = useSavedStore((state) => state.itineraries);

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [lastPrefs, setLastPrefs] = useState<PlannerPreferences | null>(null);
  const [liveRoute, setLiveRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const autoRan = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PlannerFormInput, unknown, PlannerFormValues>({
    resolver: zodResolver(plannerFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const selectedInterests = watch("interests");
  const budgetEnabled = watch("budgetEnabled");
  const travelMode = watch("travelMode");
  const includeMeal = watch("includeMeal");

  const startOptions = useMemo(
    () =>
      [...places]
        .filter((place) =>
          ["transport", "heritage", "religious", "nature", "viewpoint", "hotel"].includes(
            place.category,
          ),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [places],
  );

  function runPlanner(values: PlannerFormValues) {
    const prefs: PlannerPreferences = {
      startPlaceSlug:
        values.startPlaceSlug === "city-centre" ? null : values.startPlaceSlug,
      start: { ...KANDY_CENTER, label: "Kandy city centre" },
      startTime: values.startTime,
      availableMinutes: values.availableMinutes,
      interests: values.interests,
      budgetLkr: values.budgetEnabled ? values.budgetLkr : null,
      travelMode: values.travelMode,
      pace: values.pace,
      includeMeal: values.includeMeal,
      accessibilityNeeded: values.accessibilityNeeded,
      groupType: values.groupType,
      groupSize: values.groupSize,
      mustIncludeSlugs: hydrated ? pins : [],
    };

    const result = generateItinerary(places, prefs, {
      rainLikely: weather?.rainLikely,
    });
    setItinerary(result);
    setLastPrefs(prefs);
    setLiveRoute(null);
    if (result.stops.length === 0) {
      toast("No stops fit that window. Try a longer duration or more interests.", "info");
    }
  }

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    runPlanner(plannerFormSchema.parse(getValues()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reflow(stops: ItineraryStop[]): Itinerary | null {
    if (!itinerary || !lastPrefs) return null;
    const startMinutes = parseTimeToMinutes(itinerary.startTime) ?? 9 * 60;
    let clock = startMinutes;
    let current: { lat: number; lng: number } = itinerary.start;
    let travelMeters = 0;

    const nextStops = stops.map((stop, index) => {
      const leg = estimateTravel(current, stop.place, itinerary.mode);
      travelMeters += leg.meters;
      const arrival = clock + leg.minutes;
      const departure = arrival + stop.visitMinutes;
      clock = departure;
      current = stop.place;
      const hoursStatus = isOpenAt(
        parseOpeningHours(stop.place.openingHours),
        arrival,
      );
      const warnings: string[] = [];
      if (hoursStatus === "closed") {
        warnings.push("Arrival falls outside the recorded opening hours.");
      }
      return {
        ...stop,
        order: index + 1,
        arrivalMinutes: arrival,
        departureMinutes: departure,
        travel: leg,
        hoursStatus,
        warnings,
      };
    });

    const budget = summariseBudget({
      entryCosts: nextStops.map((stop) => stop.costLkr),
      travelMeters,
      mode: itinerary.mode,
      groupSize: lastPrefs.groupSize,
      includeMeal: lastPrefs.includeMeal,
    });

    return {
      ...itinerary,
      stops: nextStops,
      endTime: formatMinutesAsTime(clock),
      totals: {
        visitMinutes: nextStops.reduce((sum, stop) => sum + stop.visitMinutes, 0),
        travelMinutes: nextStops.reduce((sum, stop) => sum + stop.travel.minutes, 0),
        totalMinutes: clock - startMinutes,
        travelMeters,
        ...budget,
      },
      budgetStatus: budgetStatus(budget.estimatedTotalLkr, itinerary.budgetLkr, budget.unknownEntryCostCount),
      warnings: [
        ...itinerary.warnings.filter((warning) => !warning.startsWith("Manually adjusted")),
        "Manually adjusted — times recalculated with the same travel model.",
      ],
    };
  }

  function moveStop(index: number, direction: -1 | 1) {
    if (!itinerary) return;
    const next = [...itinerary.stops];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    const updated = reflow(next);
    if (updated) {
      setItinerary(updated);
      setLiveRoute(null);
    }
  }

  function removeStop(index: number) {
    if (!itinerary) return;
    const updated = reflow(itinerary.stops.filter((_, i) => i !== index));
    if (updated) {
      setItinerary(updated);
      setLiveRoute(null);
    }
  }

  async function requestLiveRoute() {
    if (!itinerary || itinerary.stops.length === 0) return;
    setRouteLoading(true);
    try {
      const stops = itinerary.stops;
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: itinerary.start,
          destination: {
            lat: stops[stops.length - 1]!.place.lat,
            lng: stops[stops.length - 1]!.place.lng,
          },
          mode: itinerary.mode,
          waypoints: stops.slice(0, -1).map((stop) => ({
            lat: stop.place.lat,
            lng: stop.place.lng,
          })),
        }),
      });
      const data = (await response.json()) as RouteResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Route request failed.");
      setLiveRoute(data);
      toast(
        data.source === "google_routes"
          ? "Live road route loaded from Google Routes."
          : "Live routing is not configured — showing a labelled estimate.",
        data.source === "google_routes" ? "success" : "info",
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not build the route.", "info");
    } finally {
      setRouteLoading(false);
    }
  }

  function onSave() {
    if (!itinerary) return;
    if (itineraries.some((item) => item.id === itinerary.id)) {
      toast("This plan is already saved on this device.", "info");
      return;
    }
    saveItinerary(
      `${itinerary.startTime} · ${itinerary.stops.length} stops in Kandy`,
      itinerary,
    );
    toast("Plan saved. Open Saved to find it again.", "success");
  }

  async function copyMarkdown() {
    if (!itinerary) return;
    try {
      await navigator.clipboard.writeText(itineraryToMarkdown(itinerary));
      toast("Plan copied as Markdown.", "success");
    } catch {
      toast("Clipboard access was blocked by the browser.", "info");
    }
  }

  const routePoints = useMemo(() => {
    if (!itinerary) return null;
    if (liveRoute) return liveRoute.polyline;
    return [
      { lat: itinerary.start.lat, lng: itinerary.start.lng },
      ...itinerary.stops.map((stop) => ({ lat: stop.place.lat, lng: stop.place.lng })),
    ];
  }, [itinerary, liveRoute]);

  const mapPlaces = itinerary ? itinerary.stops.map((stop) => stop.place) : [];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
      <form
        onSubmit={handleSubmit(runPlanner)}
        className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1"
      >
        <Card>
          <CardContent className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-mint" />
                Shape your day
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-2">
                The planner fits real places into your window. Travel times are
                estimates unless you request a live route.
              </p>
            </div>

            <div>
              <Label htmlFor="startPlaceSlug">Starting point</Label>
              <Select id="startPlaceSlug" {...register("startPlaceSlug")}>
                <option value="city-centre">Kandy city centre (lake)</option>
                {startOptions.map((place) => (
                  <option key={place.slug} value={place.slug}>
                    {place.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime">Start time</Label>
                <Input id="startTime" type="time" {...register("startTime")} />
                {errors.startTime && (
                  <p className="mt-1 text-[10px] text-red-700">{errors.startTime.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="availableMinutes">Time available</Label>
                <Select id="availableMinutes" {...register("availableMinutes")}>
                  {DURATIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatDuration(minutes)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label>Interests</Label>
              <Controller
                control={control}
                name="interests"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-1.5">
                    {categories
                      .filter((category) =>
                        [
                          "heritage",
                          "religious",
                          "nature",
                          "viewpoint",
                          "museum",
                          "experience",
                          "food",
                          "shopping",
                        ].includes(category.slug),
                      )
                      .map((category) => {
                        const active = field.value.includes(category.slug);
                        return (
                          <button
                            key={category.slug}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              field.onChange(
                                active
                                  ? field.value.filter(
                                      (item: CategorySlug) => item !== category.slug,
                                    )
                                  : [...field.value, category.slug],
                              )
                            }
                            className={cn(
                              "kv-focus inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition",
                              active
                                ? "border-accent/40 bg-accent/10 text-accent"
                                : "border-line text-muted hover:text-foreground",
                            )}
                          >
                            <CategoryIcon name={category.icon} className="h-3 w-3" />
                            {category.name}
                          </button>
                        );
                      })}
                  </div>
                )}
              />
              {errors.interests && (
                <p className="mt-1 text-[10px] text-red-700">{errors.interests.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Travel</Label>
                <div className="flex rounded-lg border border-line p-0.5">
                  {(["walk", "drive"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setValue("travelMode", mode)}
                      aria-pressed={travelMode === mode}
                      className={cn(
                        "kv-focus inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] capitalize",
                        travelMode === mode ? "bg-accent text-white" : "text-muted",
                      )}
                    >
                      {mode === "walk" ? <Footprints className="h-3 w-3" /> : <Navigation className="h-3 w-3" />}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="pace">Pace</Label>
                <Select id="pace" {...register("pace")}>
                  {Object.entries(PACE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="groupType">Group</Label>
                <Select id="groupType" {...register("groupType")}>
                  {Object.entries(GROUP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="groupSize">People</Label>
                <Input
                  id="groupSize"
                  type="number"
                  min={1}
                  max={20}
                  {...register("groupSize")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 text-[12px] text-muted">
                <input type="checkbox" className="mt-0.5 accent-emerald-600" {...register("includeMeal")} />
                <span>
                  Include a meal stop
                  <FieldHint>Adds a food place when the window allows it.</FieldHint>
                </span>
              </label>
              <label className="flex items-start gap-2 text-[12px] text-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-emerald-600"
                  {...register("accessibilityNeeded")}
                />
                <span>
                  Prioritise step-free / accessible places
                  <FieldHint>Only uses places with an accessibility note.</FieldHint>
                </span>
              </label>
              <label className="flex items-start gap-2 text-[12px] text-muted">
                <input type="checkbox" className="mt-0.5 accent-emerald-600" {...register("budgetEnabled")} />
                <span>Set a budget</span>
              </label>
              {budgetEnabled && (
                <div className="pl-5">
                  <Label htmlFor="budgetLkr">Budget (LKR)</Label>
                  <Input id="budgetLkr" type="number" min={0} step={500} {...register("budgetLkr")} />
                  <FieldHint>
                    Known entry fees plus estimated meals and transport. Unknown
                    fees are counted separately, never guessed.
                  </FieldHint>
                </div>
              )}
            </div>

            {hydrated && pins.length > 0 && (
              <div className="rounded-lg border border-mint/20 bg-mint/[0.04] p-2.5">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-mint">
                  <Pin className="h-3 w-3" />
                  Shortlisted places ({pins.length})
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {pins.map((slug) => {
                    const place = places.find((item) => item.slug === slug);
                    if (!place) return null;
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => togglePin(slug)}
                        className="kv-focus inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] text-muted hover:border-red-300/60 hover:text-red-700"
                        title="Remove from shortlist"
                      >
                        {place.name}
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted-2">
                  Pinned places are included when they fit. Remove one here to
                  exclude it on the next calculation.
                </p>
              </div>
            )}

            {weather && (
              <div className="rounded-lg border border-line/70 bg-surface/50 p-2.5 text-[11px] leading-relaxed text-muted">
                <span className={weather.rainLikely ? "text-amber" : "text-mint"}>
                  {weather.headline}
                </span>{" "}
                {weather.rainLikely ? weather.indoorAdvice : weather.outdoorAdvice}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Route className="h-4 w-4" />
              {itinerary ? "Recalculate plan" : "Build my plan"}
            </Button>
            {errors.root && (
              <p className="text-[10px] text-red-700">{errors.root.message}</p>
            )}
          </CardContent>
        </Card>

        <p className="px-1 text-[10px] leading-relaxed text-muted-2">
          Estimates use straight-line distance, a street-detour factor and a
          conservative city speed. Opening hours are only respected when a
          machine-readable value is stored.
        </p>
      </form>

      <div className="min-w-0 space-y-4">
        {!itinerary ? (
          <EmptyState
            title="Your plan will appear here"
            description="Set a start time, how long you have and what you care about. The planner will pick real places, order them sensibly and show the trade-offs."
          />
        ) : (
          <>
            <div className="rounded-2xl border border-line/80 bg-surface/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="kv-label">Your day</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    {itinerary.startTime}–{itinerary.endTime} · {itinerary.stops.length}{" "}
                    {itinerary.stops.length === 1 ? "stop" : "stops"}
                  </h2>
                  <p className="mt-1 text-[11px] text-muted-2">
                    Starting at {itinerary.start.label} ·{" "}
                    {itinerary.mode === "walk" ? "walking" : "driving"} ·{" "}
                    {lastPrefs ? PACE_LABELS[lastPrefs.pace] : "balanced"} pace
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" onClick={onSave}>
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadItineraryIcs(itinerary)}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    .ics
                  </Button>
                  <Button size="sm" variant="ghost" onClick={copyMarkdown}>
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label="Total time"
                  value={formatDuration(itinerary.totals.totalMinutes)}
                />
                <Stat
                  icon={<Route className="h-3.5 w-3.5" />}
                  label="Travelling"
                  value={`${formatDuration(itinerary.totals.travelMinutes)} · ${formatDistance(itinerary.totals.travelMeters)}`}
                />
                <Stat
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label="Estimated cost"
                  value={`LKR ${itinerary.totals.estimatedTotalLkr.toLocaleString("en-LK")}`}
                />
                <Stat
                  icon={<Info className="h-3.5 w-3.5" />}
                  label="Unknown fees"
                  value={`${itinerary.totals.unknownEntryCostCount} ${itinerary.totals.unknownEntryCostCount === 1 ? "place" : "places"}`}
                />
              </dl>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <Badge
                  variant={
                    itinerary.budgetStatus === "within"
                      ? "mint"
                      : itinerary.budgetStatus === "over"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {itinerary.budgetStatus === "within"
                    ? "Within budget"
                    : itinerary.budgetStatus === "over"
                      ? "Over budget"
                      : itinerary.budgetLkr === null
                        ? "No budget set"
                        : "Budget uncertain — unknown fees"}
                </Badge>
                {liveRoute && (
                  <Badge variant={liveRoute.source === "google_routes" ? "accent" : "amber"}>
                    {liveRoute.source === "google_routes" ? "Live route" : "Estimated route"}
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={requestLiveRoute}
                  disabled={routeLoading || itinerary.stops.length === 0}
                  className="kv-focus ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[11px] text-muted transition hover:bg-surface-2 disabled:opacity-40"
                >
                  <Navigation className="h-3 w-3" />
                  {routeLoading ? "Routing…" : "Get live route"}
                </button>
              </div>

              {liveRoute?.warning && (
                <p className="mt-2 text-[10px] leading-relaxed text-amber/90">
                  {liveRoute.warning}
                </p>
              )}
            </div>

            <div className="relative h-[360px] overflow-hidden rounded-2xl border border-line/80 bg-surface">
              {view === "3d" && !mapError ? (
                <CesiumScene
                  places={mapPlaces}
                  route={routePoints}
                  mode="explore"
                  labels={false}
                  onError={() => {
                    setMapError(true);
                    setView("2d");
                  }}
                  className="h-full w-full"
                />
              ) : (
                <FallbackMap
                  places={mapPlaces}
                  route={routePoints}
                  center={{ lat: itinerary.start.lat, lng: itinerary.start.lng }}
                  zoom={14}
                  className="h-full w-full"
                />
              )}
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
            </div>

            {itinerary.warnings.length > 0 && (
              <div className="rounded-xl border border-amber/20 bg-amber/[0.05] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Things to check
                </p>
                <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-amber/90">
                  {itinerary.warnings.map((warning) => (
                    <li key={warning}>· {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-line/80 bg-surface/40">
              <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
                <span className="text-[10px] text-muted-2">
                  Reorder or remove stops; times recalculate
                </span>
              </div>
              <ol className="divide-y divide-line/60">
                {itinerary.stops.map((stop, index) => (
                  <li key={`${stop.place.slug}-${index}`} className="flex gap-3 p-3 sm:p-4">
                    <div className="w-12 shrink-0 text-right">
                      <p className="text-[12px] font-semibold text-foreground">
                        {formatMinutesAsTime(stop.arrivalMinutes)}
                      </p>
                      <p className="text-[10px] text-muted-2">
                        {formatMinutesAsTime(stop.departureMinutes)}
                      </p>
                    </div>
                    <div className="relative flex flex-col items-center">
                      <span className="mt-1 grid h-5 w-5 place-items-center rounded-full border border-accent/40 bg-accent/10 text-[9px] font-bold text-accent">
                        {index + 1}
                      </span>
                      {index < itinerary.stops.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-line" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/places/${stop.place.slug}`}
                            className="kv-focus text-[13px] font-semibold text-foreground hover:text-accent"
                          >
                            {stop.place.name}
                          </Link>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
                            {stop.place.summary}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveStop(index, -1)}
                            disabled={index === 0}
                            className="kv-focus rounded p-1 text-muted-2 hover:text-foreground disabled:opacity-30"
                            aria-label={`Move ${stop.place.name} earlier`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStop(index, 1)}
                            disabled={index === itinerary.stops.length - 1}
                            className="kv-focus rounded p-1 text-muted-2 hover:text-foreground disabled:opacity-30"
                            aria-label={`Move ${stop.place.name} later`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStop(index)}
                            className="kv-focus rounded p-1 text-muted-2 hover:text-red-700"
                            aria-label={`Remove ${stop.place.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-2">
                        <span className="inline-flex items-center gap-1">
                          <CategoryIcon
                            name={categories.find((c) => c.slug === stop.place.category)?.icon ?? "info"}
                            className="h-3 w-3"
                          />
                          {stop.place.category}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(stop.visitMinutes)} visit
                        </span>
                        <span>
                          {stop.travel.minutes} min · {formatDistance(stop.travel.meters)}{" "}
                          {stop.travel.source === "routes_api" ? "(live)" : "(est.)"}
                        </span>
                        <span>
                          {stop.costLkr !== null
                            ? `LKR ${stop.costLkr.toLocaleString("en-LK")}`
                            : "Fee not verified"}
                        </span>
                        {stop.hoursStatus !== "unknown" && (
                          <Badge
                            variant={stop.hoursStatus === "open" ? "mint" : "amber"}
                            className="px-1.5 py-0 text-[9px]"
                          >
                            {stop.hoursStatus === "open" ? "open" : "closed at arrival"}
                          </Badge>
                        )}
                      </div>

                      {stop.warnings.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 text-[10px] leading-relaxed text-amber/80">
                          {stop.warnings.map((warning) => (
                            <li key={warning}>· {warning}</li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-2 flex gap-2">
                        <Link
                          href={`/places/${stop.place.slug}`}
                          className="kv-focus inline-flex items-center gap-1 text-[10px] text-accent hover:text-emerald-700"
                        >
                          Details
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => togglePin(stop.place.slug)}
                          className="kv-focus inline-flex items-center gap-1 text-[10px] text-muted-2 hover:text-mint"
                        >
                          <Pin className="h-3 w-3" />
                          {pins.includes(stop.place.slug) ? "Pinned" : "Pin for next time"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-foreground">Assumptions & method</h3>
                <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted">
                  {itinerary.assumptions.map((assumption) => (
                    <li key={assumption} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-mint" />
                      {assumption}
                    </li>
                  ))}
                </ul>
                {itinerary.alternatives.length > 0 && (
                  <>
                    <h4 className="mt-4 text-[11px] font-semibold text-foreground">
                      Alternatives if you have more time
                    </h4>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {itinerary.alternatives.slice(0, 6).map((place) => (
                        <Link
                          key={place.slug}
                          href={`/places/${place.slug}`}
                          className="kv-focus rounded-full border border-line px-2.5 py-1 text-[10px] text-muted hover:border-accent/40 hover:text-accent"
                        >
                          {place.name}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-line/70 bg-surface/50 px-3 py-2">
      <dt className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-muted-2">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-[12px] font-semibold text-foreground">{value}</dd>
    </div>
  );
}
