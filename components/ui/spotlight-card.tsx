"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Mouse-follow spotlight surface inspired by the Aceternity / React Bits
 * "spotlight card" pattern. The overlay is pointer-events-none so links and
 * buttons inside the card keep working normally.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(31, 138, 76, 0.14)",
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  return (
    <div
      ref={ref}
      onMouseMove={(event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={cn("group relative overflow-hidden", className)}
      style={
        {
          "--spot-x": `${position.x}px`,
          "--spot-y": `${position.y}px`,
        } as CSSProperties
      }
    >
      {children}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300",
          active && "opacity-100",
        )}
        style={{
          background: `radial-gradient(240px circle at var(--spot-x) var(--spot-y), ${spotlightColor}, transparent 70%)`,
        }}
      />
    </div>
  );
}
