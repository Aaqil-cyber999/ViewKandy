"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Heart, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import { useSavedStore } from "@/lib/store/use-saved-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";

const EXTRA_LINKS = [
  { href: "/updates", label: "Live updates" },
  { href: "/saved", label: "Saved places" },
  { href: "/auth", label: "Account" },
  { href: "/security", label: "Security & trust" },
  { href: "/admin", label: "Editorial admin" },
  { href: "/offline", label: "Offline mode" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const hydrated = useHydrated();
  const favorites = useSavedStore((s) => s.favorites);
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHomePage = pathname === "/";
  const isLightHeader = isHomePage && !isScrolled;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-300",
        isLightHeader
          ? "border-white/15 bg-[#071d2d]/78 shadow-[0_8px_32px_rgba(7,29,45,0.2)]"
          : "border-line/80 bg-canvas/88 shadow-[0_8px_32px_rgba(7,29,45,0.08)]",
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[96rem] items-center gap-6 px-4 sm:px-6 lg:h-[80px] lg:px-10">
        <Logo tone={isLightHeader ? "light" : "dark"} />

        <nav className="ml-4 hidden items-center gap-7 lg:flex" aria-label="Primary">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "kv-focus relative py-2 text-[13px] tracking-[0.01em] transition-colors",
                "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-accent after:transition-transform after:duration-300",
                isLightHeader
                  ? "text-white/90 after:bg-gold hover:text-gold after:scale-x-0 hover:after:scale-x-100"
                  : "text-muted after:scale-x-0 hover:text-foreground hover:after:scale-x-100",
                isActive(item.href) && !isLightHeader && "text-foreground after:scale-x-100",
                isActive(item.href) && isLightHeader && "text-gold after:scale-x-100",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/saved"
            className={cn(
              "kv-focus group hidden items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] transition sm:inline-flex",
              isLightHeader ? "text-white/90 hover:text-gold" : "text-muted hover:text-foreground",
            )}
            aria-label="Saved places"
          >
            <Heart className="h-3.5 w-3.5" />
            Saved
            {hydrated && favorites.length > 0 && (
              <span className="kv-nums text-gold">({favorites.length})</span>
            )}
          </Link>

          <span
            className={cn("hidden h-4 w-px sm:block", isLightHeader ? "bg-white/25" : "bg-line")}
            aria-hidden="true"
          />

          <div className="hidden sm:block">
            <LanguageSwitcher compact tone={isLightHeader ? "light" : "dark"} />
          </div>

          <Link
            href="/planner"
            className={cn(
              "kv-focus group hidden items-center gap-2 border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] transition sm:inline-flex",
              isLightHeader
                ? "border-gold/60 bg-gold/15 text-cream hover:border-gold hover:bg-gold/25"
                : "border-foreground/25 text-foreground hover:border-accent hover:bg-accent hover:text-cream",
            )}
          >
            {t("common.planTrip")}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={cn(
              "kv-focus grid h-10 w-10 place-items-center border transition lg:hidden",
              isLightHeader
                ? "border-white/35 text-white hover:border-gold hover:text-gold"
                : "border-line text-foreground hover:border-accent hover:text-accent",
            )}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className={cn(
            "kv-menu-panel fixed inset-x-0 bottom-0 top-[68px] z-40 overflow-y-auto border-t lg:hidden",
            isLightHeader
              ? "border-white/15 bg-[#071d2d]/94 backdrop-blur-2xl"
              : "border-line bg-canvas/96 backdrop-blur-2xl",
          )}
        >
          <div className="flex min-h-full flex-col px-4 pb-10 pt-6 sm:px-6">
            <p className={cn("kv-label", isLightHeader ? "text-white/70" : undefined)}>Contents</p>
            <nav className="mt-3" aria-label="Mobile">
              {siteConfig.nav.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "kv-focus flex items-baseline gap-4 border-b py-4",
                    isLightHeader
                      ? "border-white/10 text-white"
                      : "border-line/80 text-foreground",
                    isActive(item.href) &&
                      (isLightHeader ? "text-gold" : "text-accent"),
                  )}
                >
                  <span
                    className={cn(
                      "kv-nums w-6 text-[11px]",
                      isLightHeader ? "text-white/50" : "text-muted-2",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-[30px] leading-none tracking-[-0.02em]">
                    {t(item.key)}
                  </span>
                  <ArrowUpRight
                    className={cn("ml-auto h-4 w-4", isLightHeader ? "text-white/60" : "text-muted-2")}
                  />
                </Link>
              ))}
            </nav>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3">
              {EXTRA_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "kv-focus text-[13px] transition",
                    isLightHeader ? "text-white/75 hover:text-white" : "text-muted hover:text-foreground",
                    isActive(item.href) && (isLightHeader ? "text-gold" : "text-accent"),
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-auto pt-10">
              <div className="flex items-center justify-between border-t border-line pt-5">
                <LanguageSwitcher tone={isLightHeader ? "light" : "dark"} />
                <Link
                  href="/planner"
                  className="kv-focus inline-flex items-center gap-2 bg-accent px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-cream"
                >
                  {t("common.planTrip")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p
                className={cn(
                  "mt-6 text-[11px] uppercase tracking-[0.16em]",
                  isLightHeader ? "text-white/50" : "text-muted-2",
                )}
              >
                Kandy, Sri Lanka · 7.2906° N, 80.6337° E
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
