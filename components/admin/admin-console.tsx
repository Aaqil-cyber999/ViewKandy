"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  Category,
  CategorySlug,
  LocationAccuracy,
  Place,
  VerificationStatus,
} from "@/types/place";
import { placeWriteSchema } from "@/lib/validation/schemas";
import { PlaceArt } from "@/components/places/place-art";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils/cn";

interface SessionState {
  authenticated: boolean;
  email: string | null;
  configured: boolean;
}

type PlaceDraft = Omit<Place, "images">;

interface FormState {
  name: string;
  slug: string;
  category: CategorySlug;
  summary: string;
  description: string;
  lat: string;
  lng: string;
  address: string;
  website: string;
  phone: string;
  openingHours: string;
  entryFeeLkr: string;
  estimatedVisitMinutes: string;
  accessibility: string;
  tags: string;
  indoor: boolean;
  bestTime: string;
  practicalNotes: string;
  verificationStatus: VerificationStatus;
  verificationSource: string;
  verificationSourceUrl: string;
  lastVerifiedAt: string;
  locationAccuracy: LocationAccuracy;
  featured: boolean;
  priority: string;
}

const STATUS_LABELS: Record<VerificationStatus, string> = {
  verified: "Verified",
  partially_verified: "Partly verified",
  unverified: "Unverified",
};

const ACCURACY_LABELS: Record<LocationAccuracy, string> = {
  rooftop: "Rooftop",
  approximate: "Approximate",
  district: "District",
};

function emptyForm(category: CategorySlug = "heritage"): FormState {
  return {
    name: "",
    slug: "",
    category,
    summary: "",
    description: "",
    lat: "7.2936",
    lng: "80.6413",
    address: "",
    website: "",
    phone: "",
    openingHours: "",
    entryFeeLkr: "",
    estimatedVisitMinutes: "60",
    accessibility: "",
    tags: "",
    indoor: false,
    bestTime: "",
    practicalNotes: "",
    verificationStatus: "unverified",
    verificationSource: "KandyVerse editorial seed",
    verificationSourceUrl: "",
    lastVerifiedAt: "",
    locationAccuracy: "approximate",
    featured: false,
    priority: "0",
  };
}

function toForm(place: Place): FormState {
  return {
    name: place.name,
    slug: place.slug,
    category: place.category,
    summary: place.summary,
    description: place.description,
    lat: String(place.lat),
    lng: String(place.lng),
    address: place.address ?? "",
    website: place.website ?? "",
    phone: place.phone ?? "",
    openingHours: place.openingHours ?? "",
    entryFeeLkr: place.entryFeeLkr === null ? "" : String(place.entryFeeLkr),
    estimatedVisitMinutes: String(place.estimatedVisitMinutes),
    accessibility: place.accessibility ?? "",
    tags: place.tags.join(", "),
    indoor: place.indoor,
    bestTime: place.bestTime ?? "",
    practicalNotes: place.practicalNotes ?? "",
    verificationStatus: place.verification.status,
    verificationSource: place.verification.source,
    verificationSourceUrl: place.verification.sourceUrl ?? "",
    lastVerifiedAt: place.verification.lastVerifiedAt?.slice(0, 10) ?? "",
    locationAccuracy: place.locationAccuracy,
    featured: place.featured,
    priority: String(place.priority),
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function numberOrNaN(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

function draftFromForm(form: FormState, base: Place | null): PlaceDraft {
  return {
    id: base?.id ?? "",
    slug: form.slug.trim(),
    name: form.name.trim(),
    category: form.category,
    summary: form.summary.trim(),
    description: form.description.trim(),
    lat: numberOrNaN(form.lat),
    lng: numberOrNaN(form.lng),
    address: nullable(form.address),
    website: nullable(form.website),
    phone: nullable(form.phone),
    openingHours: nullable(form.openingHours),
    entryFeeLkr: form.entryFeeLkr.trim() === "" ? null : Number(form.entryFeeLkr),
    estimatedVisitMinutes: numberOrNaN(form.estimatedVisitMinutes),
    accessibility: nullable(form.accessibility),
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    indoor: form.indoor,
    bestTime: nullable(form.bestTime),
    practicalNotes: nullable(form.practicalNotes),
    verification: {
      status: form.verificationStatus,
      source: form.verificationSource.trim(),
      sourceUrl: nullable(form.verificationSourceUrl),
      lastVerifiedAt: nullable(form.lastVerifiedAt),
    },
    locationAccuracy: form.locationAccuracy,
    featured: form.featured,
    priority: numberOrNaN(form.priority),
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export function AdminConsole({ categories }: { categories: Category[] }) {
  const { toast } = useToast();
  const [session, setSession] = useState<SessionState | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CategorySlug>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | VerificationStatus>("all");

  const [editing, setEditing] = useState<Place | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formIssues, setFormIssues] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPlaces = useCallback(async () => {
    setLoadingPlaces(true);
    try {
      const response = await fetch("/api/admin/places", { cache: "no-store" });
      if (response.status === 401) {
        setSession({ authenticated: false, email: null, configured: true });
        return;
      }
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { places: Place[] };
      setPlaces(data.places);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not load places.", "info");
    } finally {
      setLoadingPlaces(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json() as Promise<SessionState>)
      .then((data) => {
        if (active) setSession(data);
      })
      .catch(() => {
        if (active) setSession({ authenticated: false, email: null, configured: true });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (session?.authenticated) void loadPlaces();
  }, [session?.authenticated, loadPlaces]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setSigningIn(true);
    setLoginError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { email: string };
      setSession({ authenticated: true, email: data.email, configured: true });
      setPassword("");
      toast("Signed in to the editorial console.", "success");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setSession({ authenticated: false, email: null, configured: true });
    setPlaces([]);
    setEditing(null);
    setCreating(false);
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm(categories[0]?.slug ?? "heritage"));
    setFormIssues([]);
  }

  function startEdit(place: Place) {
    setCreating(false);
    setEditing(place);
    setForm(toForm(place));
    setFormIssues([]);
  }

  function cancelEdit() {
    setCreating(false);
    setEditing(null);
    setFormIssues([]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setFormIssues([]);

    if (
      form.verificationStatus !== "unverified" &&
      (!form.verificationSourceUrl.trim() || !form.lastVerifiedAt.trim())
    ) {
      setFormIssues([
        "A place can only be marked verified when a source URL and verification date are recorded. Otherwise keep it unverified.",
      ]);
      return;
    }

    const candidate = draftFromForm(form, editing);
    const parsed = placeWriteSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormIssues(
        parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "place"}: ${issue.message}`,
        ),
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/admin/places/${encodeURIComponent(editing.id)}` : "/api/admin/places",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { place: Place };
      setPlaces((current) => {
        const exists = current.some((place) => place.id === data.place.id);
        return exists
          ? current.map((place) => (place.id === data.place.id ? data.place : place))
          : [...current, data.place];
      });
      toast(editing ? "Place updated." : "Place created.", "success");
      cancelEdit();
    } catch (error) {
      setFormIssues([error instanceof Error ? error.message : "Could not save the place."]);
    } finally {
      setSaving(false);
    }
  }

  async function remove(place: Place) {
    const confirmed = window.confirm(
      `Delete “${place.name}”? This removes it from the KandyVerse place records.`,
    );
    if (!confirmed) return;
    setDeletingId(place.id);
    try {
      const response = await fetch(`/api/admin/places/${encodeURIComponent(place.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response));
      setPlaces((current) => current.filter((item) => item.id !== place.id));
      toast("Place deleted.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete the place.", "info");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return places
      .filter((place) => {
        if (categoryFilter !== "all" && place.category !== categoryFilter) return false;
        if (statusFilter !== "all" && place.verification.status !== statusFilter) return false;
        if (!needle) return true;
        return (
          place.name.toLowerCase().includes(needle) ||
          place.slug.toLowerCase().includes(needle) ||
          place.tags.some((tag) => tag.toLowerCase().includes(needle))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [places, query, categoryFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: places.length,
      verified: places.filter((place) => place.verification.status === "verified").length,
      partial: places.filter((place) => place.verification.status === "partially_verified").length,
      unverified: places.filter((place) => place.verification.status === "unverified").length,
      featured: places.filter((place) => place.featured).length,
    }),
    [places],
  );

  if (!session || !session.authenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="mb-6 text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface text-accent">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Editorial console</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Place records and verification are edited here. Admin access uses a
            signed HttpOnly session cookie — no shared demo password is shipped.
          </p>
        </div>

        {!session ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              Checking admin session…
            </CardContent>
          </Card>
        ) : !session.configured ? (
          <Card>
            <CardContent className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber">
                <Lock className="h-4 w-4" />
                Admin access is not configured
              </p>
              <p className="text-[13px] leading-relaxed text-muted">
                Set <code className="rounded bg-surface px-1">ADMIN_EMAIL</code> and{" "}
                <code className="rounded bg-surface px-1">ADMIN_PASSWORD</code> (or{" "}
                <code className="rounded bg-surface px-1">ADMIN_PASSWORD_SHA256</code>) in{" "}
                <code className="rounded bg-surface px-1">.env.local</code>, then restart the
                server.
              </p>
              <p className="text-[12px] leading-relaxed text-muted-2">
                In production, prefer the SHA-256 variant so the plain password is
                never stored in the environment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <form onSubmit={signIn} className="space-y-4">
                <div>
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                {loginError && (
                  <p className="flex items-start gap-2 rounded-lg border border-red-300/50 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {loginError}
                  </p>
                )}
                <Button type="submit" disabled={signingIn} className="w-full">
                  {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {signingIn ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (creating || editing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={cancelEdit}
          className="kv-focus mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to places
        </button>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kv-label">{editing ? "Edit record" : "New record"}</p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              {editing ? editing.name : "Create a place"}
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              Only publish facts you can source. Leave hours, fees and phone numbers
              empty when unknown — the UI shows “not recorded” rather than guessing.
            </p>
          </div>
          {editing && (
            <Link
              href={`/places/${editing.slug}`}
              target="_blank"
              className="kv-focus inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
            >
              View public page
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {formIssues.length > 0 && (
          <div className="mt-5 rounded-xl border border-red-300/50 bg-red-50 px-4 py-3">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-red-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Fix these before saving
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[12px] text-red-700/80">
              {formIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={save} className="mt-6 space-y-5">
          <FormSection title="Identity" description="What the place is called and how it is described.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                  placeholder="Generated from the name if empty"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value as CategorySlug })
                  }
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(event) => setForm({ ...form, tags: event.target.value })}
                  placeholder="temple, lake, sunset"
                />
                <FieldHint>Comma separated. Used by search, never invented as claims.</FieldHint>
              </div>
            </div>
            <div>
              <Label htmlFor="summary">Summary</Label>
              <Input
                id="summary"
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                required
              />
            </div>
          </FormSection>

          <FormSection
            title="Location"
            description="Coordinates are real WGS84 values. Accuracy describes how precise they are."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.000001"
                  value={form.lat}
                  onChange={(event) => setForm({ ...form, lat: event.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.000001"
                  value={form.lng}
                  onChange={(event) => setForm({ ...form, lng: event.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="accuracy">Accuracy</Label>
                <Select
                  id="accuracy"
                  value={form.locationAccuracy}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      locationAccuracy: event.target.value as LocationAccuracy,
                    })
                  }
                >
                  {(Object.keys(ACCURACY_LABELS) as LocationAccuracy[]).map((value) => (
                    <option key={value} value={value}>
                      {ACCURACY_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex h-11 items-center gap-2 text-[13px] text-muted">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={form.indoor}
                    onChange={(event) => setForm({ ...form, indoor: event.target.checked })}
                  />
                  Indoor
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                placeholder="Leave empty if not recorded"
              />
            </div>
          </FormSection>

          <FormSection
            title="Visitor information"
            description="Facts only. Unknown values stay empty and render as “not recorded”."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="openingHours">Opening hours</Label>
                <Input
                  id="openingHours"
                  value={form.openingHours}
                  onChange={(event) => setForm({ ...form, openingHours: event.target.value })}
                  placeholder="e.g. 06:00-20:00 (only if sourced)"
                />
              </div>
              <div>
                <Label htmlFor="entryFee">Entry fee (LKR)</Label>
                <Input
                  id="entryFee"
                  type="number"
                  min={0}
                  step={50}
                  value={form.entryFeeLkr}
                  onChange={(event) => setForm({ ...form, entryFeeLkr: event.target.value })}
                  placeholder="Leave empty if unknown"
                />
              </div>
              <div>
                <Label htmlFor="visitMinutes">Typical visit (minutes)</Label>
                <Input
                  id="visitMinutes"
                  type="number"
                  min={1}
                  step={5}
                  value={form.estimatedVisitMinutes}
                  onChange={(event) =>
                    setForm({ ...form, estimatedVisitMinutes: event.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder="Leave empty if unknown"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div>
                <Label htmlFor="bestTime">Best time</Label>
                <Input
                  id="bestTime"
                  value={form.bestTime}
                  onChange={(event) => setForm({ ...form, bestTime: event.target.value })}
                  placeholder="e.g. early morning"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accessibility">Accessibility notes</Label>
              <Input
                id="accessibility"
                value={form.accessibility}
                onChange={(event) => setForm({ ...form, accessibility: event.target.value })}
                placeholder="Step-free access, steep steps, etc."
              />
            </div>
            <div>
              <Label htmlFor="practicalNotes">Practical notes</Label>
              <Textarea
                id="practicalNotes"
                rows={3}
                value={form.practicalNotes}
                onChange={(event) => setForm({ ...form, practicalNotes: event.target.value })}
              />
            </div>
          </FormSection>

          <FormSection
            title="Editorial"
            description="Featured places appear in curated sections. Priority is a manual tie-breaker."
          >
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <input
                  type="checkbox"
                  className="accent-emerald-600"
                  checked={form.featured}
                  onChange={(event) => setForm({ ...form, featured: event.target.checked })}
                />
                Featured
              </label>
              <div className="w-40">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  step={1}
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Verification"
            description="Verification is a claim about sourcing, so it needs a source and a date."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="verificationStatus">Status</Label>
                <Select
                  id="verificationStatus"
                  value={form.verificationStatus}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      verificationStatus: event.target.value as VerificationStatus,
                    })
                  }
                >
                  {(Object.keys(STATUS_LABELS) as VerificationStatus[]).map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="lastVerifiedAt">Last verified</Label>
                <Input
                  id="lastVerifiedAt"
                  type="date"
                  value={form.lastVerifiedAt}
                  onChange={(event) => setForm({ ...form, lastVerifiedAt: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="verificationSource">Source</Label>
                <Input
                  id="verificationSource"
                  value={form.verificationSource}
                  onChange={(event) =>
                    setForm({ ...form, verificationSource: event.target.value })
                  }
                  placeholder="Organisation or publication"
                  required
                />
              </div>
              <div>
                <Label htmlFor="verificationSourceUrl">Source URL</Label>
                <Input
                  id="verificationSourceUrl"
                  type="url"
                  value={form.verificationSourceUrl}
                  onChange={(event) =>
                    setForm({ ...form, verificationSourceUrl: event.target.value })
                  }
                  placeholder="https://…"
                />
              </div>
            </div>
            <p className="rounded-lg border border-amber/20 bg-amber/[0.05] px-3 py-2 text-[11px] leading-relaxed text-amber/90">
              Marking a place verified or partly verified requires both a source URL
              and a verification date. This guard is intentional: KandyVerse does not
              display unearned verification.
            </p>
          </FormSection>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-5">
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? "Saving…" : editing ? "Save changes" : "Create place"}
              </Button>
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
            {editing && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void remove(editing)}
                disabled={deletingId === editing.id}
              >
                {deletingId === editing.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kv-label">Editorial</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Place records</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
            Signed in as <span className="text-foreground">{session.email}</span>. Changes
            are written to the configured PostgreSQL database through Drizzle, or to
            the local seed-backed store when DATABASE_URL is not configured.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadPlaces()} disabled={loadingPlaces}>
            <RefreshCw className={cn("h-3.5 w-3.5", loadingPlaces && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5" />
            New place
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total places" value={stats.total} />
        <Stat label="Verified" value={stats.verified} tone="mint" />
        <Stat label="Partly verified" value={stats.partial} tone="amber" />
        <Stat label="Unverified" value={stats.unverified} />
        <Stat label="Featured" value={stats.featured} tone="accent" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, slug or tag"
            className="pl-9"
            aria-label="Search places"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as "all" | CategorySlug)}
          className="w-auto min-w-[160px]"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | VerificationStatus)}
          className="w-auto min-w-[160px]"
          aria-label="Filter by verification"
        >
          <option value="all">All verification</option>
          {(Object.keys(STATUS_LABELS) as VerificationStatus[]).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {loadingPlaces && places.length === 0 ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-16 animate-pulse rounded-xl border border-line/60 bg-surface/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
          <Database className="mx-auto h-6 w-6 text-muted-2" />
          <p className="mt-3 text-sm font-medium text-foreground">No matching places</p>
          <p className="mt-1 text-[13px] text-muted">
            Adjust the filters, or create a new record.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line/80">
          <table className="w-full text-left">
            <thead className="hidden bg-surface/70 text-[11px] uppercase tracking-wide text-muted-2 sm:table-header-group">
              <tr>
                <th className="px-4 py-3 font-medium">Place</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Verification</th>
                <th className="px-4 py-3 font-medium">Visit</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((place) => (
                <tr key={place.id} className="align-middle transition hover:bg-surface/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <PlaceArt
                        slug={place.slug}
                        category={place.category}
                        className="h-10 w-10 shrink-0 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground">{place.name}</p>
                        <p className="truncate text-[11px] text-muted-2">/{place.slug}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-2 sm:hidden">
                          {place.featured && <Badge variant="accent">Featured</Badge>}
                          <VerificationBadge status={place.verification.status} />
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-[12px] capitalize text-muted sm:table-cell">
                    {place.category}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <VerificationBadge status={place.verification.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-[12px] text-muted sm:table-cell">
                    {place.estimatedVisitMinutes} min
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => startEdit(place)}
                        aria-label={`Edit ${place.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => void remove(place)}
                        disabled={deletingId === place.id}
                        aria-label={`Delete ${place.name}`}
                        className="text-muted-2 hover:text-red-700"
                      >
                        {deletingId === place.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-2">
        Showing {filtered.length} of {places.length} records. Verification and
        coordinates are editorial data; the planner and assistant only use what is
        recorded here.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "mint" | "amber" | "accent";
}) {
  const toneClass =
    tone === "mint"
      ? "text-mint"
      : tone === "amber"
        ? "text-amber"
        : tone === "accent"
          ? "text-accent"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-2">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
