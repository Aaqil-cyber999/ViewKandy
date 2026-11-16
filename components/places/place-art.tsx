import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { getCategory } from "@/lib/data";
import { resolvePlacePhoto } from "@/lib/data/place-photos";
import type { PlaceImage } from "@/types/place";
import { CategoryIcon } from "./category-icon";

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Place artwork. Uses a real photograph when the project has one for the slug;
 * otherwise it draws the deterministic topographic plate from the Kandy basin
 * (layered ridges, contour lines, survey ticks). Photography is only shown for
 * the place it actually depicts — unknown destinations keep the generated art.
 */
export function PlaceArt({
  slug,
  category,
  className,
  showLabel = false,
  images = null,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: {
  slug: string;
  category: string;
  className?: string;
  showLabel?: boolean;
  /** Database images take precedence over the bundled local photograph. */
  images?: PlaceImage[] | null;
  sizes?: string;
  priority?: boolean;
}) {
  const meta = getCategory(category as Parameters<typeof getCategory>[0]);
  const photo = resolvePlacePhoto(slug, images);
  const seed = hash(slug);
  const phase = ((seed % 1000) / 1000) * Math.PI * 2;
  const sunX = 102 + (seed % 180);
  const sunY = 46 + ((seed >> 3) % 34);
  const ridgeShift = (seed >> 5) % 40;

  const ridge = (baseline: number, amplitude: number, offset: number) => {
    const points = 9;
    const step = 400 / (points - 1);
    const coords = Array.from({ length: points }).map((_, i) => {
      const wave =
        Math.sin(phase + i * 0.9 + offset) * 0.55 +
        Math.sin(phase * 1.7 + i * 1.7 + offset) * 0.45;
      return [i * step, baseline + wave * amplitude] as const;
    });
    return `M0 300 L${coords
      .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(" L")} L400 300 Z`;
  };

  const contour = (index: number) => {
    const y = 150 + index * 15;
    const points = 7;
    const step = 400 / (points - 1);
    return `M0 ${y} ${Array.from({ length: points })
      .map((_, i) => {
        const yy = y + Math.sin(phase + i * 1.1 + index * 0.6) * (5 + index);
        return `L${(i * step).toFixed(1)} ${yy.toFixed(1)}`;
      })
      .join(" ")}`;
  };

  return (
    <div
      className={cn("relative overflow-hidden bg-surface-2", className)}
      {...(photo
        ? {}
        : { role: "img" as const, "aria-label": `${meta.name} illustration` })}
    >
      {photo ? (
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-${slug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8f4e9" />
            <stop offset="62%" stopColor="#efe9da" />
            <stop offset="100%" stopColor="#e4dcc8" />
          </linearGradient>
          <radialGradient id={`sun-${slug}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c69a58" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#c69a58" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#c69a58" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`ink-${slug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17493a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0b2821" stopOpacity="0.96" />
          </linearGradient>
          <pattern
            id={`grid-${slug}`}
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path d="M40 0H0V40" fill="none" stroke="#14251e" strokeOpacity="0.05" />
          </pattern>
        </defs>

        <rect width="400" height="300" fill={`url(#sky-${slug})`} />
        <rect width="400" height="300" fill={`url(#grid-${slug})`} />

        {/* survey ticks along the edges */}
        <g stroke="#14251e" strokeOpacity="0.18" strokeWidth="1">
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`t${i}`} x1={i * 32} y1="0" x2={i * 32} y2={i % 3 === 0 ? 7 : 4} />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`l${i}`} x1="0" y1={i * 34} x2={i % 2 === 0 ? 6 : 3} y2={i * 34} />
          ))}
        </g>

        <circle cx={sunX} cy={sunY} r="46" fill={`url(#sun-${slug})`} />
        <circle
          cx={sunX}
          cy={sunY}
          r="13"
          fill="none"
          stroke="#a97f45"
          strokeOpacity="0.7"
          strokeWidth="1"
        />

        {/* contour lines reading across the basin */}
        <g fill="none" stroke={meta.color} strokeOpacity="0.22" strokeWidth="0.9">
          {Array.from({ length: 7 }).map((_, i) => (
            <path key={`c${i}`} d={contour(i)} />
          ))}
        </g>

        {/* layered ridges */}
        <path d={ridge(188, 16, 0)} fill={meta.color} fillOpacity="0.1" />
        <path d={ridge(212, 20, 2.2)} fill={`url(#ink-${slug})`} fillOpacity="0.24" />
        <path d={ridge(240, 16, 4.1)} fill={`url(#ink-${slug})`} fillOpacity="0.62" />
        <path d={ridge(266, 11, 5.6)} fill={`url(#ink-${slug})`} fillOpacity="0.92" />

        {/* the lake, suggested with two still lines */}
        <g stroke="#f8f4e9" strokeOpacity="0.5" strokeWidth="1">
          <line x1="34" y1="279" x2="112" y2="279" />
          <line x1="60" y1="284" x2="96" y2="284" />
        </g>

        <g
          fill="none"
          stroke="#d8c29a"
          strokeOpacity="0.55"
          strokeWidth="1"
          transform={`translate(${ridgeShift + 268} 196)`}
        >
          <circle r="14" />
          <circle r="22" opacity="0.55" />
          <path d="M-30 0H30M0 -30V30" opacity="0.3" />
        </g>
        </svg>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-forest/35 via-transparent to-transparent" />

      <div
        className="absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center border border-cream/35 bg-forest/40 text-cream/90 backdrop-blur-sm"
        aria-hidden="true"
      >
        <CategoryIcon name={meta.icon} className="h-3.5 w-3.5" />
      </div>

      {showLabel && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream">
            {meta.name}
          </span>
        </div>
      )}
    </div>
  );
}
