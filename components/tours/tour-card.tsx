import Link from "next/link";
import { ArrowRight, Clock3, Compass, Film, MapPin } from "lucide-react";
import type { Tour } from "@/types/tour";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const TONES: Record<string, string> = {
  cyan: "from-sky-500/30 via-ink-800 to-ink-900",
  amber: "from-amber-400/25 via-ink-800 to-ink-900",
  emerald: "from-emerald-400/25 via-ink-800 to-ink-900",
  violet: "from-violet-400/25 via-ink-800 to-ink-900",
  rose: "from-rose-400/25 via-ink-800 to-ink-900",
};

export function TourCard({ tour, className }: { tour: Tour; className?: string }) {
  const minutes = Math.round(tour.durationSeconds / 60);
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className={cn(
        "kv-focus group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-br p-5 transition hover:border-slate-500",
        TONES[tour.coverTone] ?? TONES.cyan,
        className,
      )}
    >
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_45%),linear-gradient(120deg,transparent_60%,rgba(4,11,20,0.7))]" />
      <div className="relative flex items-center justify-between">
        <Badge variant="neutral" className="border-white/10 bg-ink-950/50 backdrop-blur">
          <Film className="h-3 w-3" />
          Virtual tour
        </Badge>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
          <Clock3 className="h-3 w-3" />
          {minutes} min · {tour.stops.length} stops
        </span>
      </div>

      <div className="relative mt-auto pt-12">
        <h3 className="text-xl font-semibold text-white group-hover:text-accent">
          {tour.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-300">
          {tour.subtitle}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
            <MapPin className="h-3 w-3" />
            {tour.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-white">
            Play tour
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TourCta() {
  return (
    <Link
      href="/tours"
      className="kv-focus group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-line bg-ink-900/40 p-5 transition hover:border-accent/50"
    >
      <Compass className="h-6 w-6 text-accent" />
      <div>
        <h3 className="text-lg font-semibold text-white">All virtual tours</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
          Cinematic camera routes over real coordinates. Play them in 3D, or step
          through stop by stop on the 2D map.
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-accent">
          Browse tours
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
