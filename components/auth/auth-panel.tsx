"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  supabaseBrowserConfigured,
} from "@/lib/auth/supabase-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import { SyncPanel } from "@/components/auth/sync-panel";

type Mode = "signin" | "signup" | "magic";

export function AuthPanel() {
  const configured = supabaseBrowserConfigured();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(configured);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;

    client.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setChecking(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "magic") {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/saved`,
          },
        });
        if (error) throw error;
        setMessage("Check your inbox for the sign-in link. It may take a minute.");
      } else if (mode === "signup") {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/saved`,
          },
        });
        if (error) throw error;
        setMessage(
          "Account created. If email confirmation is enabled in Supabase, confirm your address before signing in.",
        );
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast("Signed in.", "success");
        window.location.assign("/saved");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
    toast("Signed out.", "info");
  }

  if (!configured) {
    return (
      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <Card>
          <CardContent>
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber/30 bg-amber/10 text-amber">
              <KeyRound className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              Accounts are not configured yet
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              KandyVerse is running without Supabase credentials, so there is no
              fake sign-in form and no pretend account. Saved places and itineraries
              continue to work locally in this browser.
            </p>
            <div className="mt-4 rounded-xl border border-line/70 bg-surface/50 p-3 text-[11px] leading-relaxed text-muted">
              To enable accounts, set{" "}
              <code className="text-accent">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="text-accent">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then run{" "}
              <code className="text-accent">npm run db:setup</code> to apply the Drizzle
              schema. The account page will switch on automatically.
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/saved"
                className="kv-focus inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-white"
              >
                Open local saves
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/admin"
                className="kv-focus inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] text-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Editorial admin
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-line/80 bg-surface/40 p-5">
          <h2 className="text-sm font-semibold text-foreground">What accounts unlock</h2>
          <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-muted">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
              Saved places and itineraries synced across devices.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
              Row-level security: each account sees only its own saves.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
              No fake identity provider — Supabase Auth handles the session.
            </li>
          </ul>
          <p className="mt-4 text-[10px] leading-relaxed text-muted-2">
            The site is fully usable without an account. Local saves are never
            uploaded silently.
          </p>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-20 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking your session…
      </div>
    );
  }

  if (user) {
    return (
      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <Card>
          <CardContent>
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-mint/30 bg-mint/10 text-mint">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-foreground">Signed in</h2>
            <p className="mt-1 text-[13px] text-muted">{user.email}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Your account is ready. Use the sync panel to move local saves into
              the account, or pull saves from another device.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/saved"
                className="kv-focus inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-white"
              >
                Open saved
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
        <SyncPanel />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
      <Card>
        <CardContent>
          <div className="flex gap-1 rounded-full border border-line p-1">
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Create account"],
                ["magic", "Magic link"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setMessage(null);
                }}
                className={`kv-focus flex-1 rounded-full px-2 py-1.5 text-[11px] ${
                  mode === value ? "bg-accent text-white" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {mode !== "magic" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "magic" ? (
                <Mail className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Email me a sign-in link"}
            </Button>
          </form>

          {message && (
            <p className="mt-3 rounded-lg border border-line/70 bg-surface/50 p-2.5 text-[11px] leading-relaxed text-muted">
              {message}
            </p>
          )}

          <p className="mt-4 text-[10px] leading-relaxed text-muted-2">
            By continuing you agree that KandyVerse stores only the account data
            needed for saved places. It never publishes your email or location.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-line/80 bg-surface/40 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-mint" />
          Real auth, real privacy
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          Authentication is handled by Supabase Auth. Saved rows are protected by
          row-level security so one account cannot read another&apos;s data. The
          service-role key is only used in server route handlers.
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-2">
          You can keep using KandyVerse without an account; local saves stay in
          this browser and are never uploaded automatically.
        </p>
      </div>
    </div>
  );
}
