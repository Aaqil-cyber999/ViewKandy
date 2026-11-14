import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "View all",
  className,
  index,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
  index?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-6", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.19em] text-accent">
            {index && <span className="kv-nums text-gold">{index}</span>}
            <span className="h-px w-7 bg-gold/70" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h2 className="kv-display mt-4 text-[clamp(1.9rem,4vw,3.1rem)] text-foreground">
          {title}
        </h2>
        {description && (
          <p className="kv-lede mt-4 max-w-xl text-[15px]">{description}</p>
        )}
      </div>
      {href && (
        <Link href={href} className="kv-focus kv-link group pb-1 text-[13px]">
          {hrefLabel}
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-line px-6 py-12 text-center">
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div
      id="page-intro"
      data-scroll-section
      data-scroll-label={eyebrow}
      className="kv-page-intro border-b border-line"
    >
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-14 lg:pt-16">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.19em] text-accent">
          <span className="h-px w-7 bg-gold/70" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="kv-display mt-5 max-w-4xl text-[clamp(2.4rem,5.4vw,4.35rem)] text-foreground">
          {title}
        </h1>
        <p className="kv-lede mt-5 max-w-2xl">{description}</p>
        {meta && <div className="mt-7">{meta}</div>}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </div>
  );
}
