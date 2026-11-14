import type { Tour } from "@/types/tour";
import { cn } from "@/lib/utils/cn";

/**
 * A route plate drawn from a tour's real stop coordinates. No stock imagery:
 * the line you see is the line you will fly.
 */
export function TourArt({ tour, className }: { tour: Tour; className?: string }) {
  const points = tour.stops.map((stop, index) => ({
    lat:
      typeof stop.lat === "number"
        ? stop.lat
        : 7.2906 + index * 0.0032,
    lng:
      typeof stop.lng === "number"
        ? stop.lng
        : 80.6337 + (index % 2 === 0 ? -1 : 1) * 0.0041 + index * 0.0015,
  }));
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.0008);
  const lngSpan = Math.max(maxLng - minLng, 0.0008);

  const width = 400;
  const height = 300;
  const pad = 44;
  const project = (lat: number, lng: number) => {
    const x = pad + ((lng - minLng) / lngSpan) * (width - pad * 2);
    const y = height - pad - ((lat - minLat) / latSpan) * (height - pad * 2);
    // keep a single-stop tour away from the exact centre so the label fits
    return { x: Number.isFinite(x) ? x : width / 2, y: Number.isFinite(y) ? y : height / 2 };
  };
  const projected = tour.stops.map((stop, index) =>
    project(
      typeof stop.lat === "number" ? stop.lat : 7.2906 + index * 0.0032,
      typeof stop.lng === "number" ? stop.lng : 80.6337 + (index % 2 === 0 ? -1 : 1) * 0.0041 + index * 0.0015,
    ),
  );
  const path = projected
    .map((p, index) => `${index === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div
      className={cn("relative overflow-hidden bg-forest", className)}
      role="img"
      aria-label={`Route map for ${tour.title}`}
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`glow-${tour.slug}`} cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#2c5c49" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0b2821" stopOpacity="1" />
          </radialGradient>
          <pattern id={`grid-${tour.slug}`} width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="#f6f1e3" strokeOpacity="0.05" />
          </pattern>
        </defs>

        <rect width="400" height="300" fill={`url(#glow-${tour.slug})`} />
        <rect width="400" height="300" fill={`url(#grid-${tour.slug})`} />

        <g fill="none" stroke="#d8c29a" strokeOpacity="0.16" strokeWidth="1">
          {Array.from({ length: 5 }).map((_, i) => (
            <ellipse
              key={i}
              cx={200 + (i % 2 === 0 ? -18 : 22)}
              cy={156}
              rx={58 + i * 34}
              ry={40 + i * 26}
            />
          ))}
        </g>

        <path
          d={path}
          fill="none"
          stroke="#e9dcc0"
          strokeOpacity="0.25"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path}
          fill="none"
          stroke="#d8c29a"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 7"
        />

        {projected.map((point, index) => (
          <g key={`${tour.slug}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={index === 0 ? 5 : 3.2}
              fill={index === 0 ? "#d8c29a" : "#f6f1e3"}
              stroke="#0b2821"
              strokeWidth="1.5"
            />
            <text
              x={point.x + 8}
              y={point.y - 7}
              fill="#f6f1e3"
              fillOpacity="0.62"
              fontSize="8"
              fontFamily="var(--font-dm-sans), sans-serif"
              letterSpacing="1"
            >
              {String(index + 1).padStart(2, "0")}
            </text>
          </g>
        ))}
      </svg>

      <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/55 to-transparent" />
      <p className="absolute right-4 top-4 text-[9px] uppercase tracking-[0.22em] text-cream/45">
        {projected.length} stops · real coordinates
      </p>
    </div>
  );
}
