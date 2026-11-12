"use client";

import { useEffect, useState } from "react";
import { CloudDownload, CloudUpload, Loader2, RefreshCw } from "lucide-react";
import type { Itinerary } from "@/lib/planner/types";
import { useSavedStore } from "@/lib/store/use-saved-store";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";

interface RemoteItinerary {
  id: string;
  title: string;
  data: Itinerary;
  created_at: string;
}

export function SyncPanel() {
  const { toast } = useToast();
  const favorites = useSavedStore((state) => state.favorites);
  const itineraries = useSavedStore((state) => state.itineraries);
  const toggleFavorite = useSavedStore((state) => state.toggleFavorite);
  const saveItinerary = useSavedStore((state) => state.saveItinerary);
  const [remoteFavorites, setRemoteFavorites] = useState<string[]>([]);
  const [remoteItineraries, setRemoteItineraries] = useState<RemoteItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [favResponse, itinResponse] = await Promise.all([
        fetch("/api/saved/favorites"),
        fetch("/api/saved/itineraries"),
      ]);
      if (!favResponse.ok || !itinResponse.ok) {
        throw new Error("Account saves could not be loaded. Check the database migration.");
      }
      const favData = (await favResponse.json()) as { favorites: string[] };
      const itinData = (await itinResponse.json()) as { itineraries: RemoteItinerary[] };
      setRemoteFavorites(favData.favorites ?? []);
      setRemoteItineraries(itinData.itineraries ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sync is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pushLocal() {
    setLoading(true);
    setError(null);
    try {
      for (const slug of favorites) {
        await fetch("/api/saved/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeSlug: slug }),
        });
      }
      for (const item of itineraries) {
        await fetch("/api/saved/itineraries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            title: item.title,
            itinerary: item.itinerary,
          }),
        });
      }
      toast("Local saves uploaded to your account.", "success");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  function pullRemote() {
    let addedFavorites = 0;
    for (const slug of remoteFavorites) {
      if (!favorites.includes(slug)) {
        toggleFavorite(slug);
        addedFavorites += 1;
      }
    }
    let addedItineraries = 0;
    for (const item of remoteItineraries) {
      if (!itineraries.some((local) => local.id === item.id)) {
        saveItinerary(item.title, item.data);
        addedItineraries += 1;
      }
    }
    toast(
      `Pulled ${addedFavorites} favourites and ${addedItineraries} itineraries into this browser.`,
      "success",
    );
  }

  return (
    <div className="rounded-2xl border border-line/80 bg-surface/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <RefreshCw className="h-4 w-4 text-accent" />
        Account sync
      </h2>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        Move saves between this browser and your account. Nothing is uploaded
        unless you press the button.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-line/70 bg-surface/50 p-2.5">
          <p className="text-muted-2">This browser</p>
          <p className="mt-0.5 font-semibold text-foreground">
            {favorites.length} places · {itineraries.length} plans
          </p>
        </div>
        <div className="rounded-lg border border-line/70 bg-surface/50 p-2.5">
          <p className="text-muted-2">Your account</p>
          <p className="mt-0.5 font-semibold text-foreground">
            {remoteFavorites.length} places · {remoteItineraries.length} plans
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-amber/20 bg-amber/[0.05] p-2 text-[10px] leading-relaxed text-amber/90">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={pushLocal} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
          Upload local
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={pullRemote}
          disabled={loading || (remoteFavorites.length === 0 && remoteItineraries.length === 0)}
        >
          <CloudDownload className="h-3.5 w-3.5" />
          Pull account
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
