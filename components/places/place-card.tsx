import Link from "next/link";
import { ArrowUpRight, Clock, MapPin } from "lucide-react";
import type { PlaceWithDistance } from "@/types/place";
import { getCategory } from "@/lib/data";
import { formatDistance, formatDuration } from "@/lib/geo/distance";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { CategoryIcon } from "./category-icon";
import { PlaceArt } from "./place-art";
import { SaveButton } from "./save-button";
import { cn } from "@/lib/utils/cn";

export function PlaceCard({
  place,
  showDistance = false,
  className,
  layout = "vertical",
}: {
  place: PlaceWithDistance;
  showDistance?: boolean;
  className?: string;
  layout?: "vertical" | "horizontal";
}) {
  const category = getCategory(place.category);
  const distance =
    showDistance && Number.isFinite(place.distanceMeters)
      ? formatDistance(place.distanceMeters)
      : null;

  return (
    <Link
      href={`/places/${place.slug}`}
      className={cn(
        "kv-focus group relative flex overflow-hidden rounded-2xl border border-line/80 bg-ink-800/50 transition hover:border-slate-600 hover:bg-ink-700/50",
        layout === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0",
          layout === "vertical" ? "h-36 w-full" : "w-28",
        )}
      >
        <PlaceArt slug={place.slug} category={place.category} className="h-full w-full" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <Badge
            variant="neutral"
            className="border-white/10 bg-ink-950/70 backdrop-blur"
            style={{ color: category.color }}
          >
            <CategoryIcon name={category.icon} className="h-3 w-3" />
            {category.name}
          </Badge>
        </div>
        <div className="absolute right-3 top-3">
          <SaveButton slug={place.slug} name={place.name} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold leading-snug text-white group-hover:text-accent">
            {place.name}
          </h3>
          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-accent" />
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-400">
          {place.summary}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(place.estimatedVisitMinutes)} est.
          </span>
          {distance && (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <MapPin className="h-3 w-3" />
              {distance}
            </span>
          )}
          <span className="ml-auto">
            <VerificationBadge status={place.verification.status} />
          </span>
        </div>
      </div>
    </Link>
  );
}
