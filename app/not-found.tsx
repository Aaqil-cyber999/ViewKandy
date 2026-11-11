import type { Metadata } from "next";
import Link from "next/link";
import { Compass, MapPin, Route } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The KandyVerse page you asked for does not exist.",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/explore", label: "Open the 3D explorer", icon: Compass },
  { href: "/places", label: "Browse places in Kandy", icon: MapPin },
  { href: "/planner", label: "Build a walkable plan", icon: Route },
];

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-16 sm:px-6">
      <div className="text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-ink-800 text-accent">
          <Compass className="h-6 w-6" />
        </span>
        <p className="kv-label mt-5">404</p>
        <h1 className="kv-display mt-2 text-3xl font-semibold text-white sm:text-4xl">
          This page could not be found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          The link may be out of date, or the place may no longer be in the
          catalogue. Nothing is guessed to fill the gap.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-2">
          {LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="kv-focus flex items-center gap-3 rounded-xl border border-line/70 bg-ink-800/40 px-3.5 py-3 text-[13px] text-slate-200 transition hover:border-slate-600 hover:text-white"
              >
                <Icon className="h-4 w-4 text-accent" />
                {item.label}
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
