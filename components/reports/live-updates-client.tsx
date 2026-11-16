"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, Filter, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

type Report = {
  id: string;
  placeSlug: string;
  category: string;
  issue: string;
  severity: string;
  description: string;
  imageUrl: string | null;
  status: string;
  moderationStatus: string;
  confirmationsStill: number;
  confirmationsCleared: number;
  confirmationsIncorrect: number;
  lastConfirmedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  freshness: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  crowd: "Crowd conditions",
  road_transport: "Road and transport",
  destination_condition: "Destination conditions",
  weather_environment: "Weather and environment",
  pricing_experience: "Pricing and visitor experiences",
  general_update: "General visitor updates",
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Unknown time";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function freshnessBadge(r: Report) {
  if (r.status === "resolved") return <Badge variant="neutral">Resolved</Badge>;
  if (r.moderationStatus === "rejected" || r.status === "rejected") return <Badge variant="neutral">Rejected</Badge>;
  if (r.moderationStatus === "approved") return <Badge variant="accent">Verified by admin</Badge>;
  if (r.freshness === "potentially_outdated" || r.status === "expired") return <Badge variant="neutral">Potentially outdated</Badge>;
  if (r.freshness === "recent") return <Badge variant="accent">Recently reported</Badge>;
  return <Badge variant="neutral">Receiving confirmations</Badge>;
}

export function LiveUpdatesClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [category, setCategory] = useState("all");
  const [recency, setRecency] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports?recent=1", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load updates");
      setReports(Array.isArray(data.reports) ? data.reports : []);
      if (typeof data.configured === "boolean") setConfigured(data.configured);
    } catch (e: any) {
      setError(e?.message || "Could not load updates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (r.moderationStatus === "rejected" || r.status === "rejected") return false;
      if (category !== "all" && r.category !== category) return false;
      if (recency === "active" && (r.status === "expired" || r.freshness === "potentially_outdated" || r.status === "resolved")) return false;
      if (recency === "recent" && r.freshness !== "recent") return false;
      return true;
    });
  }, [reports, category, recency]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-surface/40 p-3">
        <Filter className="h-4 w-4 text-muted-2" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto min-w-[180px]">
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={recency} onChange={(e) => setRecency(e.target.value)} className="w-auto min-w-[180px]">
          <option value="all">All recency</option>
          <option value="recent">Recently reported</option>
          <option value="active">Active / not outdated</option>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
      </div>

      {configured === false && (
        <div className="rounded-xl border border-amber/20 bg-amber/[0.05] p-3 text-[13px] text-muted">
          Community reporting database/migration is not configured. Apply <code>drizzle/0001_community_reports.sql</code> with a configured <code>DATABASE_URL</code>.
        </div>
      )}
      {error && <p className="text-[13px] text-red-700">{error}</p>}

      {loading ? (
        <p className="text-[14px] text-muted">Loading updates…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-[14px] text-muted-2">No updates match the current filters.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <article key={r.id} className="rounded-xl border border-line/70 bg-surface/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {freshnessBadge(r)}
                <span className="text-[12px] font-medium text-foreground">{CATEGORY_LABELS[r.category] ?? r.category}</span>
                <span className="text-[12px] text-muted">· {r.issue}</span>
                <Badge variant="neutral">{r.severity}</Badge>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-foreground">{r.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-2">
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{timeAgo(r.createdAt)}</span>
                <span>Status: {r.status} / {r.moderationStatus}</span>
                <span>Confirmations: still {r.confirmationsStill}, cleared {r.confirmationsCleared}, incorrect {r.confirmationsIncorrect}</span>
                {r.lastConfirmedAt && <span>Last confirmation {timeAgo(r.lastConfirmedAt)}</span>}
                {r.expiresAt && <span>Freshness window ends {new Date(r.expiresAt).toLocaleString("en-LK")}</span>}
              </div>
              {(r.freshness === "potentially_outdated" || r.status === "expired") && (
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Potentially outdated — do not treat as a current condition.</p>
              )}
              <div className="mt-3">
                <Link href={`/places/${r.placeSlug}`} className="text-[13px] font-medium text-accent hover:underline">View destination</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
