"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";

type Report = {
  id: string;
  createdAt: string;
  status: string;
  moderationStatus: string;
  freshness: string;
  category: string;
  issue: string;
};

/**
 * Compact live-status strip shown above the map. It mirrors the community
 * reporting API so visitors see that reports exist without treating them as
 * official data or burying them below the fold.
 */
export function PlaceReportSummary({ placeSlug }: { placeSlug: string }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/reports?place=${encodeURIComponent(placeSlug)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [placeSlug]);

  if (failed) return null;
  if (reports === null) {
    return (
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-line/70 bg-surface/40 px-3 py-2 text-[12px] text-muted-2">
        <Activity className="h-3.5 w-3.5 animate-pulse" />
        Checking recent community updates…
      </div>
    );
  }

  const visible = reports.filter(
    (report) => report.moderationStatus !== "rejected" && report.status !== "rejected",
  );
  const current = visible.filter(
    (report) => report.status !== "expired" && report.freshness !== "potentially_outdated" && report.status !== "resolved",
  );
  const latest = visible[0];

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line/70 bg-surface/40 px-3 py-2 text-[12px]">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <Activity className={`h-3.5 w-3.5 ${current.length > 0 ? "text-accent" : "text-muted-2"}`} />
        Community updates
      </span>
      <span className="text-muted">
        {visible.length === 0
          ? "No recent visitor reports for this place."
          : `${current.length} current · ${visible.length} total`}
      </span>
      {latest && (
        <span className="text-muted-2">
          Latest: {latest.issue} ({latest.freshness.replaceAll("_", " ")})
        </span>
      )}
      <Link href="#community-reports" className="ml-auto inline-flex items-center gap-1 text-accent hover:underline">
        Read reports
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
