import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/lib/config/site";

const EXPLORE_LINKS = [
  { href: "/explore", label: "3D explorer" },
  { href: "/places", label: "All places" },
  { href: "/tours", label: "Virtual tours" },
  { href: "/saved", label: "Saved places" },
];

const PLAN_LINKS = [
  { href: "/planner", label: "Trip planner" },
  { href: "/assistant", label: "AI assistant" },
  { href: "/auth", label: "Account" },
  { href: "/admin", label: "Editorial admin" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/70 bg-ink-950/60 pb-24 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-slate-400">
              {siteConfig.description}
            </p>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              Built for Kandy. Coordinates are real; distances in the planner are
              estimates unless a live route is requested.
            </p>
          </div>

          <div>
            <h2 className="kv-label">Explore</h2>
            <ul className="mt-3 space-y-2">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="kv-focus text-[13px] text-slate-400 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="kv-label">Plan</h2>
            <ul className="mt-3 space-y-2">
              {PLAN_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="kv-focus text-[13px] text-slate-400 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="kv-label">Data sources</h2>
            <ul className="mt-3 space-y-2">
              {siteConfig.footer.data.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="kv-focus inline-flex items-center gap-1 text-[13px] text-slate-400 transition hover:text-white"
                  >
                    {item.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              Verification status is shown on every place. We never invent hours,
              fees, ratings or photos.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line/70 pt-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} KandyVerse. An independent city guide.</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Kandy, Sri Lanka · 7.2906° N, 80.6337° E</span>
            <span aria-hidden="true">·</span>
            <Link href="/offline" className="kv-focus hover:text-slate-300">
              Offline mode
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
