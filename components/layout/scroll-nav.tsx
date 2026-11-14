"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils/cn";

/**
 * The reading line is the point in the viewport where a section becomes
 * "active". Keeping it above the middle means the label starts filling as the
 * heading arrives, not after the content has already passed it.
 */
const READING_LINE = 0.38;
const MIN_SCROLLABLE = 32;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

interface Section {
  id: string;
  label: string;
  /** scrollY at which this section starts filling. */
  start: number;
  /** scrollY at which this section is complete. */
  end: number;
}

function measureSections(): { sections: Section[]; maxScroll: number } {
  const viewport = window.innerHeight;
  const offset = viewport * READING_LINE;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewport);

  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-scroll-section]"),
  );

  const found: { id: string; label: string; top: number }[] = [];
  for (const node of nodes) {
    const label = node.dataset.scrollLabel?.trim();
    if (!node.id || !label) continue;
    found.push({
      id: node.id,
      label,
      top: node.getBoundingClientRect().top + window.scrollY,
    });
  }
  found.sort((a, b) => a.top - b.top);

  const sections = found.map((item, index) => {
    const next = found[index + 1];
    // The first section often starts above the reading line (the hero begins
    // at the top of the page). Clamp it to 0 so its label starts filling on
    // the first scroll instead of arriving partially complete.
    const start = Math.max(0, item.top - offset);
    // A section completes exactly when the next one becomes active, so the
    // hand-off between labels is continuous in both scroll directions.
    const nextStart = next ? Math.max(0, next.top - offset) : maxScroll;
    return {
      id: item.id,
      label: item.label,
      start,
      end: Math.max(start + 1, Math.min(nextStart, maxScroll)),
    };
  });

  if (sections.length > 0) {
    const last = sections[sections.length - 1]!;
    // The final heading can sit below the reading line on short pages. Anchor
    // it to the bottom so its label still completes before the page ends.
    last.start = Math.min(last.start, Math.max(0, maxScroll - 1));
    last.end = Math.max(last.start + 1, maxScroll);
  }

  return { sections, maxScroll };
}

export function ScrollNav() {
  // Single source of truth for every visual: the window scroll position.
  const { scrollY } = useScroll();
  const reduced = useReducedMotion();
  const pathname = usePathname();

  const [sections, setSections] = useState<Section[]>([]);
  const [maxScroll, setMaxScroll] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  // Labels only exist on wide, tall viewports. Skipping them entirely on
  // mobile avoids updating dozens of clip paths that CSS would hide anyway.
  const [showLabels, setShowLabels] = useState(false);

  const sectionsRef = useRef<Section[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const query = window.matchMedia(
      "(min-width: 768px) and (min-height: 561px)",
    );
    const update = () => setShowLabels(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const syncActive = useCallback((y: number) => {
    const list = sectionsRef.current;
    if (list.length === 0) return;
    let next = 0;
    for (let index = 0; index < list.length; index += 1) {
      if (y >= list[index]!.start) next = index;
      else break;
    }
    setActiveIndex((current) => (current === next ? current : next));
  }, []);

  useEffect(() => {
    let disposed = false;

    const measure = () => {
      if (disposed) return;
      const result = measureSections();
      sectionsRef.current = result.sections;
      setSections(result.sections);
      setMaxScroll(result.maxScroll);
      setMounted(true);
      syncActive(scrollY.get());
    };

    const schedule = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(measure);
    };

    measure();
    schedule();
    window.addEventListener("resize", schedule, { passive: true });
    document.fonts?.ready.then(schedule).catch(() => {});

    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [pathname, scrollY, syncActive]);

  useMotionValueEvent(scrollY, "change", syncActive);

  // Both the rail fill and the labels are derived from `scrollY`. Keeping the
  // same source guarantees the line and the typography never disagree.
  const progress = useTransform(scrollY, (value) =>
    clamp01(value / Math.max(1, maxScroll)),
  );
  const dotTop = useTransform(progress, [0, 1], ["0%", "100%"]);

  if (!mounted || maxScroll < MIN_SCROLLABLE) return null;

  const hasLinks = sections.length > 1 && showLabels;

  return (
    <nav
      aria-label={hasLinks ? "Page sections" : undefined}
      aria-hidden={hasLinks ? undefined : true}
      className="kv-scroll-nav pointer-events-none fixed top-1/2 z-40 -translate-y-1/2 select-none print:hidden"
    >
      <div className="flex items-center gap-2 md:gap-3">
        {hasLinks && (
          <ol className="flex flex-col items-end gap-2 md:gap-2.5">
            {sections.map((section, index) => (
              <SectionLabel
                key={section.id}
                section={section}
                index={index}
                activeIndex={activeIndex}
                scrollY={scrollY}
                reduced={Boolean(reduced)}
              />
            ))}
          </ol>
        )}

        <div className="kv-scroll-rail relative h-[34vh] max-h-[280px] min-h-[170px] md:h-[46vh] md:max-h-[380px] lg:h-[52vh] lg:max-h-[440px]">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-[2px] rounded-full bg-line/70"
          />
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-[2px] origin-top rounded-full bg-gradient-to-b from-accent via-accent to-mint"
            style={{ scaleY: progress }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute right-0 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-canvas bg-accent shadow-[0_0_0_3px_rgba(31,138,76,0.14)]"
            style={{ top: dotTop }}
          />
          {/* Below 768px the labels are hidden, so section ticks replace them:
              same measured ranges, no text, nothing wider than the rail gutter. */}
          {sections.length > 0 && (
            <span aria-hidden="true" className="absolute inset-0 md:hidden">
              {sections.map((section, index) => {
                const position =
                  (section.start / Math.max(1, maxScroll)) * 100;
                return (
                  <span
                    key={section.id}
                    className={cn(
                      "absolute right-[2px] h-[2px] -translate-y-1/2 rounded-full",
                      index === activeIndex
                        ? "w-[6px] bg-accent"
                        : index < activeIndex
                          ? "w-1 bg-accent/40"
                          : "w-[3px] bg-line",
                    )}
                    style={{
                      top: `${Math.min(97, Math.max(3, position))}%`,
                    }}
                  />
                );
              })}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}

function SectionLabel({
  section,
  index,
  activeIndex,
  scrollY,
  reduced,
}: {
  section: Section;
  index: number;
  activeIndex: number;
  scrollY: MotionValue<number>;
  reduced: boolean;
}) {
  const fill = useTransform(scrollY, (value) => {
    const span = Math.max(1, section.end - section.start);
    return clamp01((value - section.start) / span);
  });

  const isActive = index === activeIndex;
  const isPast = index < activeIndex;
  const labelClass = cn(
    "kv-focus pointer-events-auto block whitespace-nowrap text-right font-semibold uppercase leading-none",
    "text-[10px] tracking-[0.1em] lg:text-[11px] lg:tracking-[0.14em]",
    "text-muted-2/75",
  );

  if (reduced) {
    return (
      <li className="flex items-center gap-2">
        <a
          href={`#${section.id}`}
          aria-label={section.label}
          aria-current={isActive ? "true" : undefined}
          className={cn(
            labelClass,
            isPast || isActive ? "text-accent-strong" : "text-muted-2/75",
          )}
        >
          {section.label}
        </a>
        <span
          aria-hidden="true"
          className={cn(
            "h-px w-1.5 shrink-0 rounded-full",
            isActive ? "bg-accent" : isPast ? "bg-accent/40" : "bg-line",
          )}
        />
      </li>
    );
  }

  const characters = Array.from(section.label);

  return (
    <li className="flex items-center gap-2">
      <a
        href={`#${section.id}`}
        aria-label={section.label}
        aria-current={isActive ? "true" : undefined}
        className={labelClass}
      >
        <span aria-hidden="true" className="inline-flex">
          {characters.map((character, characterIndex) => (
            <FillChar
              key={`${character}-${characterIndex}`}
              character={character}
              fill={fill}
              index={characterIndex}
              total={characters.length}
            />
          ))}
        </span>
      </a>
      <span
        aria-hidden="true"
        className={cn(
          "h-px w-1.5 shrink-0 rounded-full",
          isActive ? "bg-accent" : isPast ? "bg-accent/40" : "bg-line",
        )}
      />
    </li>
  );
}

function FillChar({
  character,
  fill,
  index,
  total,
}: {
  character: string;
  fill: MotionValue<number>;
  index: number;
  total: number;
}) {
  const clipPath = useTransform(fill, (value) => {
    // Each character gets its own slice of the section progress, producing a
    // left-to-right wipe across the label instead of a colour swap.
    const local = clamp01(value * total - index);
    return `inset(0 ${(1 - local) * 100}% 0 0)`;
  });

  const glyph = character === " " ? "\u00A0" : character;

  return (
    <span className="relative inline-block">
      <span aria-hidden="true">{glyph}</span>
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 text-accent-strong"
        style={{ clipPath, willChange: "clip-path" }}
      >
        {glyph}
      </motion.span>
    </span>
  );
}
