import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "View all",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="kv-label mb-2">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="kv-focus inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          {hrefLabel}
          <ArrowRight className="h-3.5 w-3.5" />
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
    <div className="rounded-2xl border border-dashed border-line bg-ink-900/40 px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-400">
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
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line/60 bg-gradient-to-b from-ink-800/40 to-transparent">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <p className="kv-label">{eyebrow}</p>
        <h1 className="kv-display mt-3 max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          {description}
        </p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
