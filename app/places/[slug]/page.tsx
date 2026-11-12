import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Accessibility,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Clock,
  ExternalLink,
  Globe2,
  Info,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  Timer,
} from "lucide-react";
import { getPlaceBySlug, listPlaces } from "@/lib/db";
import { findNearby } from "@/lib/db/search";
import { getCategory } from "@/lib/data";
import { formatDistance, formatDuration } from "@/lib/geo/distance";
import { PlaceArt } from "@/components/places/place-art";
import { CategoryIcon } from "@/components/places/category-icon";
import { PlaceCard } from "@/components/places/place-card";
import { SaveButton, AddToTripButton } from "@/components/places/save-button";
import { PlaceMap } from "@/components/places/place-map";
import { PlaceRoutePanel } from "@/components/places/place-route-panel";
import { LiveGooglePlaces, OsmServices } from "@/components/places/live-nearby";
import { ShareButton } from "@/components/places/share-button";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return { title: "Place not found" };

  return {
    title: place.name,
    description: place.summary,
    alternates: { canonical: `/places/${place.slug}` },
    openGraph: {
      title: `${place.name} · KandyVerse`,
      description: place.summary,
      url: `${siteConfig.url}/places/${place.slug}`,
      type: "article",
    },
  };
}

function Fact({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line/60 py-3 last:border-b-0">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-surface/60 text-muted">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-2">{label}</p>
        <div className="mt-0.5 text-[13px] leading-relaxed text-foreground">{value}</div>
        {hint && <p className="mt-0.5 text-[10px] leading-relaxed text-muted-2">{hint}</p>}
      </div>
    </div>
  );
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const all = await listPlaces();
  const nearby = findNearby(all, place, 1800, undefined, 7).filter(
    (item) => item.slug !== place.slug,
  );
  const category = getCategory(place.category);
  const verified = place.verification.status === "verified";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: place.name,
    description: place.summary,
    url: `${siteConfig.url}/places/${place.slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.lat,
      longitude: place.lng,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kandy",
      addressCountry: "LK",
      streetAddress: place.address ?? undefined,
    },
    isAccessibleForFree: place.entryFeeLkr === 0 ? true : undefined,
    publicAccess: true,
    ...(place.website ? { sameAs: [place.website] } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-[11px] text-muted-2" aria-label="Breadcrumb">
          <Link href="/places" className="kv-focus inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            All places
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/explore?category=${place.category}`} className="kv-focus hover:text-foreground">
            {category.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-muted">{place.name}</span>
        </nav>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-line/80">
              <PlaceArt
                slug={place.slug}
                category={place.category}
                className="h-[260px] w-full sm:h-[340px]"
                showLabel
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <Badge
                  variant="neutral"
                  className="border-line bg-surface/70 backdrop-blur"
                  style={{ color: category.color }}
                >
                  <CategoryIcon name={category.icon} className="h-3 w-3" />
                  {category.name}
                </Badge>
                <VerificationBadge status={place.verification.status} />
                {place.featured && <Badge variant="accent">Editor&apos;s pick</Badge>}
              </div>
              <p className="absolute bottom-3 right-4 text-[9px] text-muted">
                Category identity artwork — not a photograph of this place.
              </p>
            </div>

            <div className="mt-6">
              <h1 className="kv-display text-3xl font-semibold text-foreground sm:text-4xl">
                {place.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
                {place.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {place.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line bg-surface/60 px-2.5 py-1 text-[10px] text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <SaveButton slug={place.slug} name={place.name} variant="full" />
                <AddToTripButton slug={place.slug} name={place.name} />
                <ShareButton title={place.name} />
                <Link
                  href={`/explore?place=${place.slug}`}
                  className="kv-focus inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <MapPin className="h-4 w-4" />
                  Show in explorer
                </Link>
              </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <Card>
                <CardContent>
                  <h2 className="text-sm font-semibold text-foreground">Practical information</h2>
                  <div className="mt-2">
                    <Fact
                      icon={<Clock className="h-4 w-4" />}
                      label="Opening hours"
                      value={
                        place.openingHours ?? (
                          <span className="text-muted">Not verified</span>
                        )
                      }
                      hint={
                        place.openingHours
                          ? `Source: ${place.verification.source}`
                          : "Check the official source before travelling."
                      }
                    />
                    <Fact
                      icon={<Ticket className="h-4 w-4" />}
                      label="Entry fee"
                      value={
                        place.entryFeeLkr !== null ? (
                          `LKR ${place.entryFeeLkr.toLocaleString("en-LK")}`
                        ) : (
                          <span className="text-muted">Not verified</span>
                        )
                      }
                      hint={
                        place.entryFeeLkr !== null
                          ? "Recorded by an editor; confirm on arrival."
                          : "KandyVerse does not estimate ticket prices."
                      }
                    />
                    <Fact
                      icon={<Timer className="h-4 w-4" />}
                      label="Suggested visit"
                      value={formatDuration(place.estimatedVisitMinutes)}
                      hint="Planning estimate, not an official duration."
                    />
                    <Fact
                      icon={<Accessibility className="h-4 w-4" />}
                      label="Accessibility"
                      value={
                        place.accessibility ?? (
                          <span className="text-muted">No verified note</span>
                        )
                      }
                    />
                    {place.phone && (
                      <Fact
                        icon={<Phone className="h-4 w-4" />}
                        label="Phone"
                        value={<a href={`tel:${place.phone}`}>{place.phone}</a>}
                      />
                    )}
                    {place.website && (
                      <Fact
                        icon={<Globe2 className="h-4 w-4" />}
                        label="Official website"
                        value={
                          <a
                            href={place.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:text-emerald-700"
                          >
                            Visit site
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        }
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h2 className="text-sm font-semibold text-foreground">Data & verification</h2>
                  <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-muted">
                    <div className="flex items-center gap-2">
                      {verified ? (
                        <CheckCircle2 className="h-4 w-4 text-mint" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-amber" />
                      )}
                      <span className="text-foreground">
                        Status: {place.verification.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p>
                      Source:{" "}
                      {place.verification.sourceUrl ? (
                        <a
                          href={place.verification.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:text-emerald-700"
                        >
                          {place.verification.source}
                        </a>
                      ) : (
                        place.verification.source
                      )}
                    </p>
                    <p>
                      Last verified:{" "}
                      {place.verification.lastVerifiedAt
                        ? new Date(place.verification.lastVerifiedAt).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "Not yet verified"}
                    </p>
                    <p>
                      Coordinate accuracy:{" "}
                      <span className="text-foreground">
                        {place.locationAccuracy.replaceAll("_", " ")}
                      </span>{" "}
                      · {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                    </p>
                    {!verified && (
                      <p className="rounded-lg border border-amber/20 bg-amber/[0.05] p-2.5 text-[11px] text-amber/90">
                        This record is part of the editorial seed. Hours, fees,
                        ratings and reviews are intentionally not filled in until a
                        source is recorded.
                      </p>
                    )}
                    <Link
                      href="/admin"
                      className="kv-focus inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-mint" />
                      Editor? Verify this record
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-foreground">About this place</h2>
              <p className="whitespace-pre-line text-[13px] leading-7 text-muted">
                {place.description}
              </p>
            </div>

            <div className="mt-6">
              <PlaceMap place={place} nearby={nearby} />
            </div>

            <div className="mt-6">
              <PlaceRoutePanel place={place} />
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-foreground">Live nearby data</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-2">
                Optional external enrichment, kept separate from the editorial
                catalogue. Every result is attributed to its source and is not
                treated as KandyVerse verification.
              </p>
              <div className="mt-3 space-y-3">
                <LiveGooglePlaces
                  place={place}
                  enabled={Boolean(process.env.GOOGLE_MAPS_SERVER_API_KEY)}
                />
                <OsmServices place={place} />
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardContent>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Info className="h-4 w-4 text-accent" />
                  At a glance
                </h2>
                <dl className="mt-3 space-y-2.5 text-[12px]">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted-2">Category</dt>
                    <dd className="text-right text-foreground">{category.name}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted-2">Setting</dt>
                    <dd className="text-right text-foreground">
                      {place.indoor ? "Indoor" : "Outdoor"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted-2">Best time</dt>
                    <dd className="text-right text-foreground">
                      {place.bestTime ?? "No verified note"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted-2">Address</dt>
                    <dd className="text-right text-foreground">
                      {place.address ?? "Kandy, Sri Lanka"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted-2">Coordinate</dt>
                    <dd className="text-right font-mono text-[11px] text-muted">
                      {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                    </dd>
                  </div>
                </dl>
                {place.practicalNotes && (
                  <p className="mt-3 rounded-lg border border-line/70 bg-surface/50 p-2.5 text-[11px] leading-relaxed text-muted">
                    <CircleHelp className="mr-1 inline h-3 w-3 text-muted-2" />
                    {place.practicalNotes}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarClock className="h-4 w-4 text-mint" />
                  Build this into a day
                </h2>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  Add {place.name} to your shortlist, then let the planner fit it
                  around travel time, meals and the rest of your interests.
                </p>
                <Link
                  href="/planner"
                  className="kv-focus mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-mint px-4 text-[12px] font-semibold text-white transition hover:bg-emerald-700"
                >
                  Open planner
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Nearby</h2>
                <span className="text-[10px] text-muted-2">within 1.8 km</span>
              </div>
              <div className="space-y-2">
                {nearby.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line p-4 text-[11px] text-muted-2">
                    No other places within 1.8 km in the database.
                  </p>
                ) : (
                  nearby.slice(0, 5).map((item) => (
                    <Link
                      key={item.slug}
                      href={`/places/${item.slug}`}
                      className="kv-focus flex items-center gap-3 rounded-xl border border-line/70 bg-surface/40 p-2.5 transition hover:border-accent/50"
                    >
                      <PlaceArt
                        slug={item.slug}
                        category={item.category}
                        className="h-12 w-12 shrink-0 rounded-lg"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-foreground">
                          {item.name}
                        </span>
                        <span className="block text-[10px] text-muted-2">
                          {formatDistance(item.distanceMeters)} away ·{" "}
                          {formatDuration(item.estimatedVisitMinutes)}
                        </span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-2" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>

        {nearby.length > 0 && (
          <section className="mt-14 border-t border-line/60 pt-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="kv-label">Continue exploring</p>
                <h2 className="mt-1 text-2xl font-semibold text-foreground">
                  Around {place.name}
                </h2>
              </div>
              <Link
                href={`/explore?place=${place.slug}`}
                className="kv-focus text-[12px] text-accent hover:text-emerald-700"
              >
                See on map
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.slice(0, 6).map((item) => (
                <PlaceCard key={item.slug} place={item} showDistance />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
