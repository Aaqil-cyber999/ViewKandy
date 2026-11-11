"use client";

import { Heart } from "lucide-react";
import { useSavedStore } from "@/lib/store/use-saved-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils/cn";

export function SaveButton({
  slug,
  name,
  variant = "icon",
  className,
}: {
  slug: string;
  name: string;
  variant?: "icon" | "full";
  className?: string;
}) {
  const hydrated = useHydrated();
  const favorites = useSavedStore((s) => s.favorites);
  const toggleFavorite = useSavedStore((s) => s.toggleFavorite);
  const { toast } = useToast();

  const saved = hydrated && favorites.includes(slug);

  function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(slug);
    toast(saved ? `Removed ${name} from saved places.` : `Saved ${name} on this device.`, saved ? "info" : "success");
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          "kv-focus inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition",
          saved
            ? "border-rose-400/40 bg-rose-500/10 text-rose-300"
            : "border-line text-slate-200 hover:bg-ink-700/60",
          className,
        )}
      >
        <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        {saved ? "Saved" : "Save place"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      aria-pressed={saved}
      className={cn(
        "kv-focus grid h-8 w-8 place-items-center rounded-full border border-line bg-ink-900/70 text-slate-300 backdrop-blur transition hover:text-white",
        saved && "border-rose-400/40 text-rose-300",
        className,
      )}
    >
      <Heart className={cn("h-3.5 w-3.5", saved && "fill-current")} />
    </button>
  );
}

export function AddToTripButton({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const hydrated = useHydrated();
  const pins = useSavedStore((s) => s.pins);
  const togglePin = useSavedStore((s) => s.togglePin);
  const { toast } = useToast();
  const pinned = hydrated && pins.includes(slug);

  return (
    <button
      type="button"
      onClick={() => {
        togglePin(slug);
        toast(
          pinned
            ? `Removed ${name} from your trip shortlist.`
            : `Added ${name} to your trip shortlist. Open Plan a trip to include it.`,
          pinned ? "info" : "success",
        );
      }}
      aria-pressed={pinned}
      className={cn(
        "kv-focus inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition",
        pinned
          ? "border-mint/40 bg-mint/10 text-mint"
          : "border-line text-slate-200 hover:bg-ink-700/60",
        className,
      )}
    >
      <span aria-hidden="true">{pinned ? "✓" : "+"}</span>
      {pinned ? "In shortlist" : "Add to trip"}
    </button>
  );
}
