import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Ambient Kandy weather, rendered behind the page: soft clouds, drifting mist,
 * a light drizzle and leaves falling through the garden air. Everything is
 * deterministic so server and client markup match, and the whole layer is
 * pointer-events-none. Reduced-motion users get a still, quiet page.
 */
const LEAVES = [
  { left: 3, delay: -2, duration: 21, drift: 96, spin: 340, size: 22, color: "#2f7a4a", opacity: 0.72 },
  { left: 9, delay: -11, duration: 26, drift: -72, spin: 260, size: 16, color: "#4f9a63", opacity: 0.62 },
  { left: 15, delay: -6, duration: 19, drift: 120, spin: 480, size: 19, color: "#3f8f5b", opacity: 0.68 },
  { left: 21, delay: -18, duration: 28, drift: -96, spin: 300, size: 24, color: "#1f6b3d", opacity: 0.6 },
  { left: 27, delay: -9, duration: 23, drift: 68, spin: 560, size: 15, color: "#a97a3f", opacity: 0.58 },
  { left: 33, delay: -15, duration: 25, drift: -110, spin: 380, size: 20, color: "#5fa86b", opacity: 0.66 },
  { left: 39, delay: -4, duration: 18, drift: 84, spin: 620, size: 17, color: "#2f7a4a", opacity: 0.74 },
  { left: 45, delay: -21, duration: 29, drift: -64, spin: 280, size: 22, color: "#4a8a52", opacity: 0.6 },
  { left: 51, delay: -13, duration: 22, drift: 132, spin: 440, size: 16, color: "#b58a44", opacity: 0.58 },
  { left: 57, delay: -7, duration: 24, drift: -88, spin: 520, size: 21, color: "#3f8f5b", opacity: 0.68 },
  { left: 63, delay: -19, duration: 27, drift: 74, spin: 320, size: 18, color: "#1f6b3d", opacity: 0.6 },
  { left: 69, delay: -3, duration: 20, drift: -118, spin: 600, size: 15, color: "#5fa86b", opacity: 0.64 },
  { left: 75, delay: -16, duration: 26, drift: 92, spin: 360, size: 23, color: "#2f7a4a", opacity: 0.62 },
  { left: 81, delay: -10, duration: 23, drift: -76, spin: 500, size: 17, color: "#a97a3f", opacity: 0.56 },
  { left: 87, delay: -23, duration: 30, drift: 108, spin: 300, size: 20, color: "#4a8a52", opacity: 0.6 },
  { left: 93, delay: -5, duration: 19, drift: -92, spin: 580, size: 16, color: "#3f8f5b", opacity: 0.68 },
  { left: 12, delay: -24, duration: 31, drift: 60, spin: 260, size: 14, color: "#b58a44", opacity: 0.5 },
  { left: 66, delay: -12, duration: 25, drift: -104, spin: 460, size: 18, color: "#4f9a63", opacity: 0.58 },
];

const RAIN = Array.from({ length: 24 }, (_, index) => ({
  left: (index * 4.7 + 3) % 100,
  delay: -((index % 7) * 0.35),
  duration: 1.7 + (index % 5) * 0.22,
  opacity: 0.12 + (index % 3) * 0.05,
}));

export function FallingLeaves({
  limit = LEAVES.length,
  className,
}: {
  limit?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {LEAVES.slice(0, limit).map((leaf, index) => (
        <span
          key={index}
          className={`kv-leaf${index >= 8 ? " kv-leaf--optional" : ""}`}
          style={
            {
              left: `${leaf.left}%`,
              animationDelay: `${leaf.delay}s`,
              animationDuration: `${leaf.duration}s`,
              "--leaf-drift": `${leaf.drift}px`,
              "--leaf-spin": `${leaf.spin}deg`,
              "--leaf-opacity": leaf.opacity,
              width: leaf.size,
              height: leaf.size,
              color: leaf.color,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
            <path
              d="M12 2.5C7.6 4.1 4.5 7.6 4.5 12c0 4.1 3.4 7.5 7.5 7.5 4.6 0 7.5-4.1 7.5-9.5 0-3.4-2.8-6.1-7.5-7.5Z"
              fill="currentColor"
            />
            <path
              d="M12 4.5c1.4 3.7 1.2 7.6-.4 13"
              fill="none"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}

export function AmbientNature() {
  return (
    <div
      aria-hidden="true"
      className="kv-ambient pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="kv-cloud kv-cloud-a" />
      <div className="kv-cloud kv-cloud-b" />
      <div className="kv-cloud kv-cloud-c" />

      <div className="kv-mist kv-mist-a" />
      <div className="kv-mist kv-mist-b" />
      <div className="kv-mist kv-mist-c" />

      <div className="kv-rain">
        {RAIN.map((drop, index) => (
          <span
            key={index}
            style={{
              left: `${drop.left}%`,
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration}s`,
              opacity: drop.opacity,
            }}
          />
        ))}
      </div>

      <FallingLeaves />
    </div>
  );
}
