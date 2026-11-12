"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, X } from "lucide-react";
import type { Category, CategorySlug, Place } from "@/types/place";
import { searchPlaces } from "@/lib/db/search";
import { PlaceCard } from "@/components/places/place-card";
import { CategoryIcon } from "@/components/places/category-icon";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/section";
import { cn } from "@/lib/utils/cn";

export function PlacesBrowser({
  places,
  categories,
  initialCategory,
}: {
  places: Place[];
  categories: Category[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<CategorySlug[]>(
    initialCategory && categories.some((c) => c.slug === initialCategory)
      ? [initialCategory as CategorySlug]
      : [],
  );
  const [sort, setSort] = useState<"recommended" | "name" | "visit">("recommended");
  const [onlyVerified, setOnlyVerified] = useState(false);

  const results = useMemo(() => {
    const found = searchPlaces(places, {
      q: query,
      categories: active.length ? active : undefined,
      limit: 200,
    }).filter((place) =>
      onlyVerified ? place.verification.status === "verified" : true,
    );

    if (sort === "name") return [...found].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "visit") {
      return [...found].sort(
        (a, b) => a.estimatedVisitMinutes - b.estimatedVisitMinutes,
      );
    }
    return found;
  }, [places, query, active, sort, onlyVerified]);

  const verifiedCount = places.filter((p) => p.verification.status === "verified").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-line/80 bg-surface/50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, interest or neighbourhood…"
              className="pl-9"
              aria-label="Search all places"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="sm:w-44"
              aria-label="Sort places"
            >
              <option value="recommended">Recommended</option>
              <option value="name">Name A–Z</option>
              <option value="visit">Shortest visit</option>
            </Select>
            <Button
              variant={onlyVerified ? "mint" : "outline"}
              onClick={() => setOnlyVerified((value) => !value)}
              className="shrink-0"
              aria-pressed={onlyVerified}
            >
              <ShieldCheck className="h-4 w-4" />
              Verified
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((category) => {
            const selected = active.includes(category.slug);
            return (
              <button
                key={category.slug}
                type="button"
                onClick={() =>
                  setActive((current) =>
                    current.includes(category.slug)
                      ? current.filter((item) => item !== category.slug)
                      : [...current, category.slug],
                  )
                }
                aria-pressed={selected}
                className={cn(
                  "kv-focus inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
                  selected
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-line text-muted hover:text-foreground",
                )}
              >
                <CategoryIcon name={category.icon} className="h-3 w-3" />
                {category.name}
              </button>
            );
          })}
          {(active.length > 0 || query || onlyVerified) && (
            <button
              type="button"
              onClick={() => {
                setActive([]);
                setQuery("");
                setOnlyVerified(false);
              }}
              className="kv-focus inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-muted-2 hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-2">
        <span>
          Showing {results.length} of {places.length} places
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-mint" />
          {verifiedCount === 0
            ? "No place has completed editorial verification yet"
            : `${verifiedCount} editorially verified`}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nothing matches that combination"
            description={
              onlyVerified
                ? "No place currently meets the verified bar. Turn off the verified filter to see the full editorial dataset, or help verify a place through the admin editor."
                : "Try a shorter search term or remove a category."
            }
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActive([]);
                  setQuery("");
                  setOnlyVerified(false);
                }}
              >
                Reset filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((place) => (
            <PlaceCard key={place.slug} place={place} />
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-line/70 bg-surface/40 p-5 text-[12px] leading-relaxed text-muted">
        <h2 className="text-sm font-semibold text-foreground">How verification works</h2>
        <p className="mt-2">
          <span className="text-mint">Verified</span> means an editor checked the
          place against a named source and recorded the date.{" "}
          <span className="text-amber">Partly verified</span> means some fields have
          a source and others do not. <span className="text-muted">Unverified</span>{" "}
          means the place exists in the editorial seed but its hours, fees and phone
          number are intentionally left blank.{" "}
          <Link href="/admin" className="text-accent hover:text-emerald-700">
            Editors can update records
          </Link>{" "}
          without inventing missing values.
        </p>
      </div>
    </div>
  );
}
