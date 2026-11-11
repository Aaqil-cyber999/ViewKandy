"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, Heart, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import { useSavedStore } from "@/lib/store/use-saved-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";

const EXTRA_LINKS = [
  { href: "/saved", label: "Saved" },
  { href: "/auth", label: "Account" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const hydrated = useHydrated();
  const favorites = useSavedStore((s) => s.favorites);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "kv-focus rounded-full px-3.5 py-2 text-[13px] font-medium transition",
                isActive(item.href)
                  ? "bg-ink-700/80 text-white"
                  : "text-slate-400 hover:bg-ink-700/50 hover:text-white",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>

          <Link
            href="/saved"
            className="kv-focus relative hidden h-9 w-9 place-items-center rounded-full border border-line text-slate-300 transition hover:bg-ink-700/60 hover:text-white sm:grid"
            aria-label="Saved places"
          >
            <Heart className="h-4 w-4" />
            {hydrated && favorites.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {favorites.length}
              </span>
            )}
          </Link>

          <Link
            href="/planner"
            className="kv-focus hidden h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-ink-950 transition hover:bg-sky-300 sm:inline-flex"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {t("common.planTrip")}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="kv-focus grid h-9 w-9 place-items-center rounded-full border border-line text-slate-200 lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line/70 bg-ink-900/95 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-3" aria-label="Mobile">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "kv-focus rounded-lg px-3 py-2.5 text-sm",
                  isActive(item.href)
                    ? "bg-ink-700 text-white"
                    : "text-slate-300 hover:bg-ink-700/60",
                )}
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="my-2 h-px bg-line/70" />
            {EXTRA_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="kv-focus rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-ink-700/60"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 sm:hidden">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
