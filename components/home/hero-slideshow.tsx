"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Rotating hero background for the home page. Crossfades between the supplied
 * Kandy photographs on an interval; respects prefers-reduced-motion by showing
 * a single still image instead of cycling.
 */
const DEFAULT_INTERVAL_MS = 6000;

export function HeroSlideshow({
  images,
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
}: {
  images: { src: string; alt: string }[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion || images.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [images.length, intervalMs, reduceMotion]);

  if (images.length === 0) return null;

  return (
    <div className={className} aria-hidden="true">
      {images.map((image, i) => (
        <div
          key={image.src}
          className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out motion-reduce:transition-none"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
