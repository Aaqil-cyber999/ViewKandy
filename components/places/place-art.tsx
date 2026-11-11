import { cn } from "@/lib/utils/cn";
import { getCategory } from "@/lib/data";
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
 * Generative category artwork. KandyVerse deliberately does not ship stock
 * photos pretending to be specific places; place photography is added by
 * admins with credit + licence, otherwise this identity graphic is used.
 */
export function PlaceArt({
  slug,
  category,
  className,
  showLabel = false,
}: {
  slug: string;
  category: string;
  className?: string;
  showLabel?: boolean;
}) {
  const meta = getCategory(category as Parameters<typeof getCategory>[0]);
  const seed = hash(slug);
  const rotation = seed % 360;
  const phase = (seed % 100) / 100;

  return (
    <div
      className={cn("relative overflow-hidden bg-ink-800", className)}
      role="img"
      aria-label={`${meta.name} illustration`}
    >
      <svg
        viewBox="0 0 400 240"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`glow-${slug}`} cx="30%" cy="20%" r="80%">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.38" />
            <stop offset="55%" stopColor={meta.color} stopOpacity="0.07" />
            <stop offset="100%" stopColor="#07111f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`fade-${slug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b1728" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#07111f" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill="#0b1728" />
        <rect width="400" height="240" fill={`url(#glow-${slug})`} />
        <g
          stroke={meta.color}
          strokeOpacity="0.28"
          fill="none"
          strokeWidth="1"
          transform={`rotate(${rotation} 200 120)`}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const r = 26 + i * 17;
            return (
              <ellipse
                key={i}
                cx={200 + Math.sin(phase * 6 + i) * 12}
                cy={120 + Math.cos(phase * 5 + i) * 8}
                rx={r * 1.35}
                ry={r}
              />
            );
          })}
        </g>
        <g stroke="#94a3b8" strokeOpacity="0.08" strokeWidth="0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 20} x2="400" y2={i * 20} />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="240" />
          ))}
        </g>
        <rect width="400" height="240" fill={`url(#fade-${slug})`} />
      </svg>

      <div className="relative flex h-full w-full items-center justify-center">
        <CategoryIcon
          name={meta.icon}
          className="h-14 w-14 opacity-80"
        />
      </div>

      {showLabel && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: meta.color }}
          >
            {meta.name}
          </span>
        </div>
      )}
    </div>
  );
}
