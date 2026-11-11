"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // User cancelled or clipboard is unavailable; no misleading success state.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "kv-focus inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-slate-200 transition hover:bg-ink-700/60",
        className,
      )}
      aria-label={`Share ${title}`}
    >
      {copied ? <Check className="h-4 w-4 text-mint" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
