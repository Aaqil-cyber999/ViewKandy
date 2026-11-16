import Link from "next/link";
import { ArrowUpRight, Clock, MapPin } from "lucide-react";
import type { PlaceWithDistance } from "@/types/place";
import { getCategory } from "@/lib/data";
import { formatDistance, formatDuration } from "@/lib/geo/distance";
import { VerificationBadge } from "@/components/ui/badge";
import { CategoryIcon } from "./category-icon";
import { PlaceArt } from "./place-art";
import { SaveButton } from "./save-button";
import { cn } from "@/lib/utils/cn";

export function PlaceCard({
  place,
  showDistance = false,
  className,
  layout = "vertical",
  feature = false,
}: {
  place: PlaceWithDistance;
  showDistance?: boolean;
  className?: string;
  layout?: "vertical" | "horizontal";
  feature?: boolean;
}) {
  const category = getCategory(place.category);
  const distance =
    showDistance && Number.isFinite(place.distanceMeters)
      ? formatDistance(place.distanceMeters)
      : null;

  if (layout === "horizontal") {
    return (
      <Link
        href={`/places/${place.slug}`}
        className={cn(
          "kv-focus group flex gap-4 rounded-2xl border border-line/70 bg-surface/80 p-3 shadow-[0_16px_40px_-32px_rgba(7,29,45,0.48)] transition-[transform,border-color,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface hover:shadow-[0_22px_48px_-32px_rgba(7,29,45,0.55)]",
          className,
        )}
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden sm:h-28 sm:w-32">
          <PlaceArt
            slug={place.slug}
            category={place.category}
            images={place.images}
            sizes="128px"
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            {category.name}
          </p>
          <h3 className="mt-1 font-display text-[19px] leading-tight text-foreground transition-colors group-hover:text-accent">
            {place.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
            {place.summary}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[11px] text-muted-2">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(place.estimatedVisitMinutes)}
            </span>
            {distance && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {distance}
              </span>
            )}
            <span className="ml-auto">
              <VerificationBadge status={place.verification.status} />
            </span>
          </div>
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-2 transition group-hover:text-accent" />
      </Link>
    );
  }

  return (
    <Link
      href={`/places/${place.slug}`}
      className={cn(
        "kv-focus group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-line/70 bg-gradient-to-br from-surface via-surface to-lake-soft/45 shadow-[0_18px_48px_-32px_rgba(7,29,45,0.45)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_26px_58px_-34px_rgba(7,29,45,0.62)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-t-[1.35rem] bg-surface-2",
          feature ? "aspect-[5/4] sm:aspect-[16/11]" : "aspect-[4/3]",
        )}
      >
        <PlaceArt
          slug={place.slug}
          category={place.category}
          images={place.images}
          sizes={
            feature
              ? "(max-width: 1024px) 100vw, 50vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
          className="h-full w-full transition-transform duration-[900ms] ease-out group-hover:scale-[1.035]"
        />

        {feature && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest via-forest/45 to-transparent" />
        )}

        {feature ? (
          <div className="absolute inset-x-0 bottom-0 p-5 text-cream sm:p-7">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-soft">
              <CategoryIcon name={category.icon} className="h-3 w-3" />
              {category.name}
            </p>
            <h3 className="mt-2 font-display text-[clamp(1.6rem,2.8vw,2.5rem)] leading-[1.03]">
              {place.name}
            </h3>
            <p className="mt-2 line-clamp-2 max-w-md text-[13px] leading-relaxed text-cream/75">
              {place.summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cream/25 pt-3 text-[10px] uppercase tracking-[0.14em] text-cream/70">
              <span>{formatDuration(place.estimatedVisitMinutes)} visit</span>
              {distance && <span>{distance}</span>}
              <span className="inline-flex items-center gap-1.5 text-cream">
                Read the guide
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 border border-cream/40 bg-forest/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream backdrop-blur-sm">
            <CategoryIcon name={category.icon} className="h-3 w-3" />
            {category.name}
          </div>
        )}

        <div className="absolute right-3 top-3">
          <SaveButton slug={place.slug} name={place.name} />
        </div>
      </div>

      {!feature && (
        <div className="px-4 pb-4 pt-4">
          <h3 className="font-display text-[21px] leading-[1.15] text-foreground decoration-accent/40 underline-offset-4 transition-colors group-hover:text-accent group-hover:underline">
            {place.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
            {place.summary}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-2.5 text-[11px] text-muted-2">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(place.estimatedVisitMinutes)}
            </span>
            {distance && (
              <span className="inline-flex items-center gap-1 text-muted">
                <MapPin className="h-3 w-3" />
                {distance}
              </span>
            )}
            <span className="ml-auto">
              <VerificationBadge status={place.verification.status} />
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}
