import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock3, MapPin } from "lucide-react";
import { TourPlayer, type ResolvedStop } from "@/components/tours/tour-player";
import { PlaceArt } from "@/components/places/place-art";
import { Badge } from "@/components/ui/badge";
import { seedTours } from "@/lib/data";
import { listPlaces } from "@/lib/db";
import { formatDuration } from "@/lib/geo/distance";
import { siteConfig } from "@/lib/config/site";

export const revalidate = 300;

export function generateStaticParams() {
  return seedTours.map((tour) => ({ slug: tour.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = seedTours.find((item) => item.slug === slug);
  if (!tour) return { title: "Tour not found" };
  return {
    title: tour.title,
    description: tour.description,
    alternates: { canonical: `/tours/${tour.slug}` },
    openGraph: {
      title: `${tour.title} · KandyVerse`,
      description: tour.subtitle,
      url: `${siteConfig.url}/tours/${tour.slug}`,
      type: "video.other",
    },
  };
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tour = seedTours.find((item) => item.slug === slug);
  if (!tour) notFound();

  const places = await listPlaces();
  const bySlug = new Map(places.map((place) => [place.slug, place]));
  const stops: ResolvedStop[] = tour.stops
    .map((stop) => {
      const place = bySlug.get(stop.placeSlug);
      return place ? { stop, place } : null;
    })
    .filter((item): item is ResolvedStop => Boolean(item));

  if (stops.length === 0) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-2 text-[11px] text-slate-500" aria-label="Breadcrumb">
        <Link href="/tours" className="kv-focus inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft className="h-3 w-3" />
          All tours
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-slate-400">{tour.title}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="kv-label">Virtual tour · {tour.theme}</p>
          <h1 className="kv-display mt-2 text-3xl font-semibold text-white sm:text-4xl">
            {tour.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{tour.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            <Clock3 className="h-3 w-3" />
            {formatDuration(tour.durationSeconds / 60)}
          </Badge>
          <Badge variant="neutral">
            <MapPin className="h-3 w-3" />
            {stops.length} stops
          </Badge>
          <Badge variant="neutral" className="capitalize">
            {tour.difficulty}
          </Badge>
        </div>
      </div>

      <div className="mt-5">
        <TourPlayer tour={tour} stops={stops} />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white">Stops on this route</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          The player visits these in order. Every stop links to its full record,
          including the verification status.
        </p>
        <ol className="mt-4 space-y-3">
          {stops.map((item, index) => (
            <li
              key={item.place.slug}
              className="flex gap-4 rounded-2xl border border-line/70 bg-ink-800/40 p-3"
            >
              <div className="relative shrink-0">
                <PlaceArt
                  slug={item.place.slug}
                  category={item.place.category}
                  className="h-20 w-28 rounded-xl sm:h-24 sm:w-36"
                />
                <span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-ink-950/80 text-[9px] font-bold text-accent backdrop-blur">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="kv-label">{item.stop.headline}</p>
                <Link
                  href={`/places/${item.place.slug}`}
                  className="kv-focus mt-0.5 block text-sm font-semibold text-white hover:text-accent"
                >
                  {item.place.name}
                </Link>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                  {item.stop.note}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <span>{item.stop.dwellSeconds}s on screen</span>
                  <span>·</span>
                  <span>{item.place.summary}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
