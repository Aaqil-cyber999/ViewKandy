import Link from "next/link";
import { ArrowUpRight, Clock3, Film, MapPin } from "lucide-react";
import type { Tour } from "@/types/tour";
import { cn } from "@/lib/utils/cn";
import { TourArt } from "./tour-art";

export function TourCard({ tour, className }: { tour: Tour; className?: string }) {
  const minutes = Math.round(tour.durationSeconds / 60);
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className={cn(
        "kv-focus group relative flex min-h-[340px] flex-col overflow-hidden rounded-[1.5rem] border border-cream/15 shadow-[0_18px_48px_-30px_rgba(7,29,45,0.48)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_28px_64px_-34px_rgba(7,29,45,0.7)]",
        className,
      )}
    >
      <TourArt
        tour={tour}
        className="absolute inset-0 h-full w-full transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
      />

      <div className="relative z-10 flex items-center justify-between p-5">
        <span className="inline-flex items-center gap-1.5 border border-cream/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/85">
          <Film className="h-3 w-3" />
          Virtual tour
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-cream/60">
          <Clock3 className="h-3 w-3" />
          {minutes} min · {tour.stops.length} stops
        </span>
      </div>

      <div className="relative z-10 mt-auto p-5 pt-12">
        <h3 className="font-display text-[clamp(1.6rem,2.4vw,2.15rem)] leading-[1.05] text-cream">
          {tour.title}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-sm text-[13px] leading-relaxed text-cream/65">
          {tour.subtitle}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-cream/20 pt-3">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-cream/55">
            <MapPin className="h-3 w-3" />
            {tour.difficulty}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-cream">
            Play tour
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TourCta({ count }: { count?: number }) {
  return (
    <Link
      href="/tours"
      className="kv-focus group relative flex min-h-[340px] flex-col justify-between rounded-[1.5rem] border border-line bg-gradient-to-br from-surface to-canvas p-6 shadow-[0_18px_48px_-34px_rgba(7,29,45,0.42)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_26px_58px_-34px_rgba(7,29,45,0.58)]"
    >
      <div className="flex items-start justify-between">
        <span className="kv-label">The full collection</span>
        {typeof count === "number" && (
          <span className="font-display text-5xl leading-none text-gold/60">
            {String(count).padStart(2, "0")}
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display text-[clamp(1.6rem,2.4vw,2.15rem)] leading-[1.05] text-foreground">
          Every route, on one map
        </h3>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
          Cinematic camera routes over real coordinates. Play them in 3D, or step
          through stop by stop on the 2D map.
        </p>
        <span className="mt-5 inline-flex items-center gap-2 border-t border-line pt-3 text-[11px] uppercase tracking-[0.16em] text-accent">
          Browse tours
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
