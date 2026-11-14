"use client";

import { Check, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { LOCALES } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher({
  compact = false,
  tone = "dark",
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const { locale, setLocale, partial } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "kv-focus inline-flex items-center gap-2 border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition",
          tone === "light"
            ? "border-white/35 text-white/90 hover:border-gold hover:text-gold"
            : "border-line text-muted hover:border-accent/50 hover:text-foreground",
          compact && "px-2.5",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.label}`}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{current.native}</span>
        {partial && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden border border-line bg-surface p-1 shadow-[0_24px_60px_-32px_rgba(11,40,33,0.55)]"
        >
          {LOCALES.map((option) => (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={option.code === locale}
              onClick={() => {
                setLocale(option.code);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-surface-2"
            >
              <span>
                {option.native}
                <span className="ml-2 text-[11px] uppercase tracking-wide text-muted-2">
                  {option.code}
                </span>
              </span>
              {option.code === locale && <Check className="h-3.5 w-3.5 text-mint" />}
            </button>
          ))}
          {partial && (
            <p className="border-t border-line px-3 py-2 text-[11px] leading-relaxed text-muted-2">
              Partial translation — missing strings fall back to English.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
