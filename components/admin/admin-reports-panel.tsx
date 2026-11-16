"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Flag, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

const ACTIONS = [
  { value: "approve", label: "Approve", icon: CheckCircle2 },
  { value: "resolve", label: "Resolve", icon: ShieldCheck },
  { value: "flag", label: "Flag", icon: Flag },
  { value: "reject", label: "Reject", icon: XCircle },
] as const;

export function AdminReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [history, setHistory] = useState<Record<string, { loading: boolean; events?: Array<{ id: string; action: string; reason: string | null; actorEmail: string | null; createdAt: string }>; error?: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load reports");
      setReports(Array.isArray(data.reports) ? data.reports : []);
      if (typeof data.configured === "boolean") setConfigured(data.configured);
    } catch (e: any) {
      setError(e?.message || "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (filter !== "all" && r.moderationStatus !== filter && r.status !== filter) return false;
      if (!q) return true;
      return [r.placeSlug, r.category, r.issue, r.description, r.id].some((v) => v.toLowerCase().includes(q));
    });
  }, [reports, filter, query]);

  async function loadHistory(id: string) {
    setHistory((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const res = await fetch(`/api/admin/reports/${encodeURIComponent(id)}/history`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load history");
      setHistory((prev) => ({
        ...prev,
        [id]: { loading: false, events: Array.isArray(data.events) ? data.events : [] },
      }));
    } catch (e: any) {
      setHistory((prev) => ({ ...prev, [id]: { loading: false, error: e?.message || "Could not load history." } }));
    }
  }

  async function moderate(id: string, action: "approve" | "reject" | "resolve" | "flag") {
    const reason = (reasons[id] ?? "").trim();
    if ((action === "reject" || action === "flag") && !reason) {
      setError("A reason is required when rejecting or flagging a report.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Moderation failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "Moderation failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-10 border-t border-line/60 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kv-label">Moderation</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">Community reports</h2>
          <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-muted">
            Review visitor-submitted reports. Approve, reject (with reason), flag, or resolve. Community reports are separate from editorial place data and may be unverified or outdated.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh reports
        </Button>
      </div>

      {configured === false && (
        <div className="mt-4 rounded-xl border border-amber/20 bg-amber/[0.05] p-3 text-[13px] text-muted">
          Database/migration not configured. Apply <code>drizzle/0001_community_reports.sql</code> with a configured <code>DATABASE_URL</code> to enable community reporting.
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300/50 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search place, issue, description, id" className="min-w-[240px] flex-1" />
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto min-w-[180px]">
          <option value="all">All statuses</option>
          <option value="pending">Pending moderation</option>
          <option value="approved">Approved</option>
          <option value="flagged">Flagged</option>
          <option value="rejected">Rejected</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="expired">Expired</option>
        </Select>
      </div>

      <div className="mt-4 space-y-3">
        {loading && reports.length === 0 ? (
          <p className="text-[13px] text-muted">Loading reports…</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-[14px] text-muted">No matching reports.</CardContent></Card>
        ) : filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{r.placeSlug}</Badge>
                    <Badge variant="neutral">{r.category}</Badge>
                    <Badge variant={r.moderationStatus === "approved" ? "accent" : "neutral"}>{r.moderationStatus}</Badge>
                    <Badge variant="neutral">{r.status}</Badge>
                    <Badge variant="neutral">{r.freshness}</Badge>
                  </div>
                  <p className="mt-2 text-[14px] font-medium text-foreground">{r.issue} <span className="font-normal text-muted">(severity: {r.severity})</span></p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{r.description}</p>
                  {r.imageUrl && (
                    <a href={r.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[12px] font-medium text-accent hover:underline">
                      View attached photo
                    </a>
                  )}
                  <p className="mt-2 text-[11px] text-muted-2">
                    ID: {r.id} · Created {new Date(r.createdAt).toLocaleString("en-LK")} · Confirmations: still {r.confirmationsStill}, cleared {r.confirmationsCleared}, incorrect {r.confirmationsIncorrect}
                    {r.lastConfirmedAt ? ` · Last confirmed ${new Date(r.lastConfirmedAt).toLocaleString("en-LK")}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={reasons[r.id] ?? ""}
                  onChange={(e) => setReasons((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Moderation reason (required for reject/flag)"
                  className="min-w-[260px] flex-1"
                />
                {ACTIONS.map(({ value, label, icon: Icon }) => (
                  <Button key={value} size="sm" variant={value === "reject" ? "outline" : "secondary"} disabled={busyId === r.id} onClick={() => void moderate(r.id, value)}>
                    {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                    {label}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" disabled={history[r.id]?.loading} onClick={() => void loadHistory(r.id)}>
                  {history[r.id]?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  History
                </Button>
              </div>
              {history[r.id] && !history[r.id]?.loading && (
                <div className="rounded-lg border border-line/70 bg-surface/40 p-2.5 text-[11px] text-muted">
                  {history[r.id]?.error ? (
                    <span className="text-red-700">{history[r.id]?.error}</span>
                  ) : (history[r.id]?.events?.length ?? 0) === 0 ? (
                    <span>No moderation history recorded yet.</span>
                  ) : (
                    <ul className="space-y-1">
                      {history[r.id]?.events?.map((event) => (
                        <li key={event.id}>
                          <span className="font-medium text-foreground">{event.action}</span>
                          {event.reason ? ` — ${event.reason}` : ""} · {new Date(event.createdAt).toLocaleString("en-LK")}
                          {event.actorEmail ? ` · by ${event.actorEmail}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
