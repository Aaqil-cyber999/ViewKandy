import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff, Compass, MapPin, Route, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Offline",
  description: "KandyVerse offline fallback page.",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/places", label: "Browse cached place records", icon: MapPin },
  { href: "/planner", label: "Open the itinerary planner", icon: Route },
  { href: "/explore", label: "Return to the 3D explorer", icon: Compass },
];

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-16 sm:px-6">
      <div className="text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-amber">
          <WifiOff className="h-6 w-6" />
        </span>
        <h1 className="kv-display mt-5 text-3xl font-semibold text-foreground sm:text-4xl">
          You are offline
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          KandyVerse keeps a small app shell on this device. Live weather, routing,
          the AI assistant and admin changes need a connection.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-2">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="kv-focus flex items-center gap-3 rounded-xl border border-line/70 px-3.5 py-3 text-[13px] text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              <item.icon className="h-4 w-4 text-accent" />
              {item.label}
            </Link>
          ))}
        </CardContent>
      </Card>

      <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-muted-2">
        <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Saved places, shortlists and itineraries are stored in this browser, so they
        remain available once the shell loads. Opening a new place page still needs
        the network.
      </p>
    </div>
  );
}
