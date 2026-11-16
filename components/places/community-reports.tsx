"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Flag, ImagePlus, Loader2, MessageSquarePlus, RefreshCw, ThumbsDown, ThumbsUp, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  updatedAt: string;
  expiresAt: string | null;
  freshness: string;
};

const CATEGORIES: Record<string, { label: string; issues: string[] }> = {
  crowd: { label: "Crowd conditions", issues: ["Very quiet", "Quiet", "Moderate", "Busy", "Extremely crowded"] },
  road_transport: { label: "Road and transport", issues: ["Traffic congestion", "Road closure", "Road construction", "Parking availability", "Tuk-tuk or transport difficulties", "Public transport disruption"] },
  destination_condition: { label: "Destination conditions", issues: ["Temporarily closed", "Unexpected opening-hour changes", "Entry restrictions", "Maintenance work", "Poor cleanliness", "Facilities unavailable", "Accessibility problems"] },
  weather_environment: { label: "Weather and environment", issues: ["Heavy rain", "Flooding", "Strong winds", "Poor visibility", "Slippery walking paths", "Other environmental conditions"] },
  pricing_experience: { label: "Pricing and visitor experiences", issues: ["Unexpected entrance fees", "Price changes", "Unexpected additional charges", "Overcharging concerns", "Misleading offers", "Other relevant visitor experiences"] },
  general_update: { label: "General visitor updates", issues: ["Beautiful current viewpoint conditions", "Special event", "Local activity", "Useful visitor information", "Other relevant observation"] },
};

const SEVERITIES = [
  { value: "info", label: "Info" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

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

function freshnessBadge(freshness: string, moderationStatus: string, status: string) {
  if (status === "resolved") return <Badge variant="neutral">Resolved</Badge>;
  if (moderationStatus === "rejected" || status === "rejected") return <Badge variant="neutral">Rejected</Badge>;
  if (moderationStatus === "approved") return <Badge variant="accent">Verified by admin</Badge>;
  if (freshness === "potentially_outdated" || status === "expired") return <Badge variant="neutral">Potentially outdated</Badge>;
  if (freshness === "recent") return <Badge variant="accent">Recently reported</Badge>;
  return <Badge variant="neutral">Receiving confirmations</Badge>;
}

export function CommunityReports({ placeSlug }: { placeSlug: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState<keyof typeof CATEGORIES>("crowd");
  const [issue, setIssue] = useState<string>(CATEGORIES.crowd!.issues[0] ?? "Very quiet");
  const [severity, setSeverity] = useState("info");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const issues = useMemo(() => CATEGORIES[category]?.issues ?? [], [category]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?place=${encodeURIComponent(placeSlug)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load reports");
      setReports(Array.isArray(data.reports) ? data.reports : []);
      if (typeof data.configured === "boolean") setConfigured(data.configured);
    } catch (e: any) {
      setError(e?.message || "Could not load community reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeSlug]);

  useEffect(() => {
    if (issues.length > 0 && !issues.includes(issue)) setIssue(issues[0]!);
  }, [issues, issue]);

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  function onPickFile(file: File | null) {
    setSubmitMsg(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSubmitMsg("Unsupported image type. Use JPEG, PNG, WebP, or AVIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setSubmitMsg("Image is too large (max 5 MB).");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      const res = await fetch("/api/reports/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Image upload failed");
      return typeof data.path === "string" ? data.path : null;
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      let imagePath: string | null = null;
      if (imageFile) {
        imagePath = await uploadImage();
      }
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeSlug, category, issue, severity, description, imagePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit report");
      setSubmitMsg("Thanks. Your report was submitted for review and will appear based on moderation/freshness rules. It is not treated as confirmed fact.");
      setDescription("");
      onPickFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setShowForm(false);
      await load();
    } catch (e: any) {
      setSubmitMsg(e?.message || "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirm(id: string, vote: "still_happening" | "no_longer_happening" | "incorrect") {
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(id)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit feedback");
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not submit feedback.");
    }
  }

  const visible = reports.filter((r) => !(r.moderationStatus === "rejected" || r.status === "rejected"));

  return (
    <section id="community-reports" data-scroll-section data-scroll-label="Community reports" className="mt-8 rounded-2xl border border-line/80 bg-surface/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kv-label">Community reports</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Live visitor updates (community-submitted)</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
            Reports are timestamped, may be unverified, and can become outdated. They are shown separately from official/editorial destination data and should be treated as helpful signals, not confirmed facts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}><MessageSquarePlus className="h-3.5 w-3.5" />{showForm ? "Close" : "Report update"}</Button>
        </div>
      </div>

      {configured === false && (
        <div className="mt-3 rounded-lg border border-amber/20 bg-amber/[0.05] p-3 text-[12px] text-muted">
          Community reporting storage is not configured yet (database/migration required). Submissions may be unavailable until <code>DATABASE_URL</code> is set and migrations are applied.
        </div>
      )}
      {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}
      {submitMsg && <p className="mt-3 text-[12px] text-muted">{submitMsg}</p>}

      {showForm && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-line/70 bg-surface/60 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="report-category">Category</Label>
              <Select id="report-category" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                {Object.entries(CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="report-issue">Issue / condition</Label>
              <Select id="report-issue" value={issue} onChange={(e) => setIssue(e.target.value)}>
                {issues.map((i) => <option key={i} value={i}>{i}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="report-severity">Severity / level</Label>
              <Select id="report-severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="report-photo">Optional photo (JPEG/PNG/WebP/AVIF, max 5 MB)</Label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Input ref={fileRef} id="report-photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} className="max-w-xs" />
                {imageFile && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { onPickFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                    <X className="h-3.5 w-3.5" />Remove
                  </Button>
                )}
              </div>
              {imagePreview && (
                <div className="mt-2 overflow-hidden rounded-lg border border-line/70 bg-surface/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Selected report preview" className="max-h-40 w-auto object-cover" />
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted-2">Photos are uploaded to secure storage when configured and may be reviewed by moderators. Do not include personal information.</p>
            </div>
          </div>
          <div>
            <Label htmlFor="report-description">Short description</Label>
            <Textarea id="report-description" value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} maxLength={1000} rows={4} placeholder="What did you observe? Keep it factual and helpful." required />
            <p className="mt-1 text-[11px] text-muted-2">{description.length}/1000</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={submitting || uploading}>
              {(submitting || uploading) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Uploading photo…" : submitting ? "Submitting…" : "Submit report"}
            </Button>
            <p className="text-[11px] text-muted-2">Submissions are rate-limited and subject to moderation. Old reports are not shown as live conditions.</p>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-[13px] text-muted">Loading reports…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-[13px] text-muted-2">No community reports to show for this place right now. If conditions change, you can be the first to share a helpful update.</p>
        ) : (
          visible.map((r) => (
            <article key={r.id} className="rounded-xl border border-line/70 bg-surface/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {freshnessBadge(r.freshness, r.moderationStatus, r.status)}
                    <span className="text-[12px] font-medium text-foreground">{CATEGORIES[r.category]?.label ?? r.category}</span>
                    <span className="text-[12px] text-muted">· {r.issue}</span>
                    <span className="text-[11px] text-muted-2">Severity: {r.severity}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-foreground">{r.description}</p>
                  {r.imageUrl && (
                    <a href={r.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-accent hover:underline">
                      <ImagePlus className="h-3.5 w-3.5" />View attached photo
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-2">
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Reported {timeAgo(r.createdAt)}</span>
                {r.lastConfirmedAt && <span>Last confirmation {timeAgo(r.lastConfirmedAt)}</span>}
                {r.expiresAt && <span>Freshness window ends {new Date(r.expiresAt).toLocaleString("en-LK")}</span>}
                <span>Status: {r.status.replaceAll("_", " ")} / {r.moderationStatus.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted-2">Is this still accurate?</span>
                <Button size="sm" variant="secondary" onClick={() => confirm(r.id, "still_happening")}><ThumbsUp className="h-3.5 w-3.5" />Still happening ({r.confirmationsStill})</Button>
                <Button size="sm" variant="secondary" onClick={() => confirm(r.id, "no_longer_happening")}><CheckCircle2 className="h-3.5 w-3.5" />No longer happening ({r.confirmationsCleared})</Button>
                <Button size="sm" variant="secondary" onClick={() => confirm(r.id, "incorrect")}><ThumbsDown className="h-3.5 w-3.5" />Incorrect ({r.confirmationsIncorrect})</Button>
              </div>
              {r.moderationStatus === "pending" && (
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-2"><Flag className="h-3.5 w-3.5" />Pending review: shown with caution and may change after moderation.</p>
              )}
              {(r.freshness === "potentially_outdated" || r.status === "expired") && (
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />This report may be outdated and should not be treated as a current condition.</p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
