"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Heart,
  Pin,
  Route,
  Trash2,
} from "lucide-react";
import type { Place } from "@/types/place";
import { PlaceCard } from "@/components/places/place-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/section";
import { useSavedStore } from "@/lib/store/use-saved-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useToast } from "@/components/providers/toast-provider";
import { downloadItineraryIcs } from "@/lib/planner/export";
import { formatDistance, formatDuration, formatMinutesAsTime } from "@/lib/geo/distance";
import { cn } from "@/lib/utils/cn";

type Tab = "places" | "itineraries" | "shortlist";

export function SavedClient({ places }: { places: Place[] }) {
  const hydrated = useHydrated();
  const { toast } = useToast();
  const favorites = useSavedStore((state) => state.favorites);
  const itineraries = useSavedStore((state) => state.itineraries);
  const pins = useSavedStore((state) => state.pins);
  const toggleFavorite = useSavedStore((state) => state.toggleFavorite);
  const removeItinerary = useSavedStore((state) => state.removeItinerary);
  const togglePin = useSavedStore((state) => state.togglePin);
  const clearPins = useSavedStore((state) => state.clearPins);
  const clearAll = useSavedStore((state) => state.clearAll);
  const [tab, setTab] = useState<Tab>("places");
  const [expanded, setExpanded] = useState<string | null>(null);

  const placeMap = useMemo(() => new Map(places.map((place) => [place.slug, place])), [places]);
  const savedPlaces = favorites
    .map((slug) => placeMap.get(slug))
    .filter((place): place is Place => Boolean(place));
  const missingFavorites = favorites.filter((slug) => !placeMap.has(slug));
  const pinnedPlaces = pins
    .map((slug) => placeMap.get(slug))
    .filter((place): place is Place => Boolean(place));

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-40 animate-pulse rounded-2xl border border-line/60 bg-ink-800/40" />
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "places", label: "Saved places", count: savedPlaces.length },
    { id: "itineraries", label: "Itineraries", count: itineraries.length },
    { id: "shortlist", label: "Trip shortlist", count: pinnedPlaces.length },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">On this device</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-400">
            Favourites, plans and the trip shortlist are stored in this browser.
            When Supabase auth is configured, account sync is available from the
            account page.
          </p>
        </div>
        {(favorites.length > 0 || itineraries.length > 0 || pins.length > 0) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm("Remove all saved places, plans and pins from this browser?")) {
                clearAll();
                toast("All local saves cleared.", "info");
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear everything
          </Button>
        )}
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-line p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "kv-focus inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition",
              tab === item.id ? "bg-accent text-ink-950" : "text-slate-400 hover:text-white",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[9px] font-bold",
                tab === item.id ? "bg-ink-950/20" : "bg-ink-700",
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "places" && (
          <>
            {savedPlaces.length === 0 ? (
              <EmptyState
                title="No saved places yet"
                description="Tap the heart on any place card to keep it here. Saved places stay on this device and work offline."
                action={
                  <Link
                    href="/places"
                    className="kv-focus inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-ink-950"
                  >
                    Browse places
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedPlaces.map((place) => (
                  <div key={place.slug} className="relative">
                    <PlaceCard place={{ ...place, distanceMeters: Number.POSITIVE_INFINITY }} />
                    <button
                      type="button"
                      onClick={() => {
                        toggleFavorite(place.slug);
                        toast(`Removed ${place.name} from saved places.`, "info");
                      }}
                      className="kv-focus absolute bottom-3 right-3 rounded-full border border-line bg-ink-900/90 px-2 py-1 text-[9px] text-slate-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {missingFavorites.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber/20 bg-amber/[0.04] p-3 text-[11px] text-amber/90">
                {missingFavorites.length} saved{" "}
                {missingFavorites.length === 1 ? "place is" : "places are"} no longer in
                the database (the editor may have removed them).{" "}
                <button
                  type="button"
                  onClick={() => missingFavorites.forEach((slug) => toggleFavorite(slug))}
                  className="underline underline-offset-2"
                >
                  Remove stale entries
                </button>
              </div>
            )}
          </>
        )}

        {tab === "itineraries" && (
          <>
            {itineraries.length === 0 ? (
              <EmptyState
                title="No saved itineraries"
                description="Build a plan, then use Save to keep it here with its times, costs and route."
                action={
                  <Link
                    href="/planner"
                    className="kv-focus inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-ink-950"
                  >
                    Open planner
                    <Route className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {itineraries.map((item) => {
                  const isOpen = expanded === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-line/80 bg-ink-800/40 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                          <p className="mt-1 text-[11px] text-slate-500">
                            <CalendarDays className="mr-1 inline h-3 w-3" />
                            {new Date(item.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · {item.itinerary.stops.length} stops ·{" "}
                            {formatDuration(item.itinerary.totals.totalMinutes)} · LKR{" "}
                            {item.itinerary.totals.estimatedTotalLkr.toLocaleString("en-LK")} est.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadItineraryIcs(item.itinerary)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            .ics
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpanded(isOpen ? null : item.id)}
                          >
                            {isOpen ? "Hide stops" : "Show stops"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-300 hover:bg-red-500/10"
                            onClick={() => {
                              removeItinerary(item.id);
                              toast("Itinerary removed.", "info");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isOpen && (
                        <ol className="mt-3 space-y-1.5 border-t border-line/60 pt-3">
                          {item.itinerary.stops.map((stop) => (
                            <li
                              key={stop.place.slug}
                              className="flex items-start gap-2 text-[11px]"
                            >
                              <span className="w-10 shrink-0 font-mono text-slate-500">
                                {formatMinutesAsTime(stop.arrivalMinutes)}
                              </span>
                              <Link
                                href={`/places/${stop.place.slug}`}
                                className="kv-focus text-slate-300 hover:text-accent"
                              >
                                {stop.place.name}
                              </Link>
                              <span className="ml-auto shrink-0 text-slate-600">
                                {formatDistance(stop.travel.meters)} · {stop.travel.minutes} min
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        <Badge variant="neutral">
                          {item.itinerary.mode === "walk" ? "Walking" : "Driving"}
                        </Badge>
                        <Badge
                          variant={
                            item.itinerary.budgetStatus === "within"
                              ? "mint"
                              : item.itinerary.budgetStatus === "over"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {item.itinerary.budgetStatus === "within"
                            ? "Within budget"
                            : item.itinerary.budgetStatus === "over"
                              ? "Over budget"
                              : "Budget unknown"}
                        </Badge>
                        <span>
                          {item.itinerary.totals.unknownEntryCostCount} unverified{" "}
                          {item.itinerary.totals.unknownEntryCostCount === 1 ? "fee" : "fees"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "shortlist" && (
          <>
            {pinnedPlaces.length === 0 ? (
              <EmptyState
                title="Your trip shortlist is empty"
                description="Use “Add to trip” on a place page to pin it. The planner tries to include pinned places when they fit your window."
                action={
                  <Link
                    href="/explore"
                    className="kv-focus inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-ink-950"
                  >
                    Explore places
                    <Pin className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    {pinnedPlaces.length} pinned · the planner will try to include them
                  </p>
                  <Button size="sm" variant="ghost" onClick={clearPins}>
                    Clear shortlist
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {pinnedPlaces.map((place) => (
                    <div
                      key={place.slug}
                      className="flex items-center gap-2 rounded-xl border border-line/70 bg-ink-800/40 p-2.5"
                    >
                      <Pin className="h-3.5 w-3.5 shrink-0 text-mint" />
                      <Link
                        href={`/places/${place.slug}`}
                        className="kv-focus min-w-0 flex-1 truncate text-[12px] text-white hover:text-accent"
                      >
                        {place.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => togglePin(place.slug)}
                        className="kv-focus rounded p-1 text-slate-500 hover:text-red-300"
                        aria-label={`Remove ${place.name} from shortlist`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Link
                  href="/planner"
                  className="kv-focus mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-mint px-4 text-[13px] font-semibold text-ink-950"
                >
                  Plan with these places
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
