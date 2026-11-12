import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CloudSun,
  Database,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeroScene } from "@/components/home/hero-scene";
import { PlaceCard } from "@/components/places/place-card";
import { TourCard, TourCta } from "@/components/tours/tour-card";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { CategoryIcon } from "@/components/places/category-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Marquee } from "@/components/ui/marquee";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { listPlaces } from "@/lib/db";
import { getCategory, seedCategories, seedTours } from "@/lib/data";
import { fetchWeather, weatherAdvice } from "@/lib/weather/open-meteo";
import type { PlaceWithDistance } from "@/types/place";

export const revalidate = 900;

const STEPS = [
  {
    icon: MapPinned,
    title: "Pick real places",
    body: "Every location has real coordinates in Kandy. Filter by interest, distance and whether you need to stay indoors.",
  },
  {
    icon: Route,
    title: "Build a walkable plan",
    body: "The planner respects your time window, budget, opening hours where verified, and how fast you actually move.",
  },
  {
    icon: Bot,
    title: "Ask for a second opinion",
    body: "The assistant is grounded in the same database. If a fact is not stored, it says so instead of guessing.",
  },
];

export default async function HomePage() {
  const places = await listPlaces();
  const withDistance: PlaceWithDistance[] = places.map((place) => ({
    ...place,
    distanceMeters: Number.POSITIVE_INFINITY,
  }));

  const featured = [...withDistance]
    .filter((place) => place.featured)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);

  const weather = await fetchWeather();
  const advice = weather ? weatherAdvice(weather) : null;
  const weatherLine = weather
    ? `${Math.round(weather.current.temperatureC)}°C · ${weather.current.condition.label}`
    : "Unavailable";

  const verifiedCount = places.filter((p) => p.verification.status === "verified").length;

  return (
    <>
      <HeroScene
        places={withDistance}
        placeCount={places.length}
        categoryCount={seedCategories.length}
        weatherLine={weatherLine}
      />

      <div className="border-b border-accent/20 bg-accent-soft/70">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <span className="kv-label hidden shrink-0 sm:inline">In the catalogue</span>
          <Marquee className="min-w-0 flex-1">
            {featured.map((place) => {
              const category = getCategory(place.category);
              return (
                <Link
                  key={place.slug}
                  href={`/places/${place.slug}`}
                  className="kv-focus inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line/80 bg-surface/90 px-3 py-1.5 text-[11px] text-muted transition hover:border-accent/50 hover:text-foreground"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {place.name}
                </Link>
              );
            })}
          </Marquee>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="py-16" aria-labelledby="categories-heading">
          <SectionHeading
            eyebrow="Start with an interest"
            title="What kind of Kandy do you want?"
            description="Twelve categories, from the sacred to the practical. Every filter maps to real coordinates and editorial notes."
            href="/explore"
            hrefLabel="Open the explorer"
          />
          <Reveal>
            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {seedCategories.map((category) => {
                const count = places.filter((p) => p.category === category.slug).length;
                return (
                  <Link
                    key={category.slug}
                    href={`/explore?category=${category.slug}`}
                    className="kv-focus group flex items-center gap-3 rounded-xl border border-line/90 bg-surface/90 px-3.5 py-3 shadow-[0_10px_30px_-26px_rgba(20,102,58,0.5)] transition hover:border-accent/50 hover:bg-surface"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border"
                      style={{
                        borderColor: `${category.color}44`,
                        backgroundColor: `${category.color}14`,
                        color: category.color,
                      }}
                    >
                      <CategoryIcon name={category.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {category.name}
                      </span>
                      <span className="block text-[10px] text-muted-2">{count} places</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-2 transition group-hover:text-accent" />
                  </Link>
                );
              })}
            </div>
          </Reveal>
        </section>

        <section className="border-t border-line/60 py-16" aria-labelledby="featured-heading">
          <SectionHeading
            eyebrow="Editor's shortlist"
            title="The places that explain Kandy"
            description="The lake, the temple, the ridge and the museums. Start here if you have one day."
            href="/places"
            hrefLabel="All places"
          />
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((place, index) => (
              <Reveal key={place.slug} delay={index * 0.05} className="h-full">
                <PlaceCard place={place} className="h-full" />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t border-line/60 py-16">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal className="h-full">
              <Card className="h-full overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-line/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="kv-label">Live conditions</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    Kandy right now
                  </h2>
                </div>
                {weather ? (
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                      <WeatherIcon icon={weather.current.condition.icon} className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-2xl font-semibold leading-none text-foreground">
                        {Math.round(weather.current.temperatureC)}°C
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        {weather.current.condition.label} · feels{" "}
                        {Math.round(weather.current.apparentC)}°
                      </p>
                    </div>
                  </div>
                ) : (
                  <Badge variant="amber">Weather unavailable</Badge>
                )}
              </div>
              <CardContent className="space-y-4">
                {weather && advice ? (
                  <>
                    <p className="text-sm text-muted">{advice.headline}</p>
                    <div className="grid gap-2 text-[12px] leading-relaxed text-muted sm:grid-cols-2">
                      <p className="rounded-lg border border-line/70 bg-surface/50 p-3">
                        <span className="mb-1 block font-medium text-foreground">If it rains</span>
                        {advice.indoorAdvice}
                      </p>
                      <p className="rounded-lg border border-line/70 bg-surface/50 p-3">
                        <span className="mb-1 block font-medium text-foreground">If it clears</span>
                        {advice.outdoorAdvice}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-2">
                      {weather.daily.slice(0, 3).map((day) => (
                        <span key={day.date} className="inline-flex items-center gap-1.5">
                          <CloudSun className="h-3.5 w-3.5" />
                          {new Date(`${day.date}T00:00:00`).toLocaleDateString("en-GB", {
                            weekday: "short",
                          })}{" "}
                          {Math.round(day.minC)}–{Math.round(day.maxC)}° ·{" "}
                          {day.precipitationProbability}% rain
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-2">
                      Source: Open-Meteo (CC BY 4.0), updated{" "}
                      {new Date(weather.fetchedAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      . No cached values are shown when the service is down.
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] leading-relaxed text-muted">
                    Open-Meteo could not be reached. KandyVerse does not invent
                    weather values — the rest of the site still works, and the
                    planner will avoid claiming rain conditions it cannot verify.
                  </p>
                )}
              </CardContent>
              </Card>
            </Reveal>

            <Reveal className="h-full" delay={0.06}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-mint" />
                  <h2 className="text-lg font-semibold text-foreground">Plan around your day</h2>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  Tell the planner how long you have, where you are starting, and
                  what you care about. It returns a timed itinerary with honest
                  estimates, a route on the map, and warnings when something does
                  not fit.
                </p>
                <ul className="mt-4 space-y-2 text-[12px] text-muted">
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                    Time windows and travel time, not just a list of pins.
                  </li>
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                    Budget shown as known cost plus unknown-entry count.
                  </li>
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                    Live Google route on demand when a server key is configured.
                  </li>
                </ul>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  <Link
                    href="/planner"
                    className="kv-focus inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Build an itinerary
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/assistant"
                    className="kv-focus inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] text-foreground transition hover:bg-surface-2"
                  >
                    Ask a question
                  </Link>
                </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line/60 py-16" aria-labelledby="tours-heading">
          <SectionHeading
            eyebrow="Virtual tours"
            title="See the city before you walk it"
            description="Camera routes over real coordinates. Play the whole sequence, or stop wherever you want to read more."
            href="/tours"
            hrefLabel="All tours"
          />
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seedTours.slice(0, 2).map((tour, index) => (
              <Reveal key={tour.slug} delay={index * 0.05} className="h-full">
                <TourCard tour={tour} className="h-full" />
              </Reveal>
            ))}
            <Reveal delay={0.1} className="h-full">
              <TourCta />
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line/60 py-16">
          <SectionHeading
            eyebrow="How it works"
            title="A guide that would rather say “I don't know”"
            description="The difference between a useful city guide and a hallucination is the data layer. Here is how KandyVerse is built."
          />
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={index * 0.06} className="h-full">
                  <SpotlightCard className="h-full rounded-2xl">
                    <Card className="h-full">
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="font-mono text-[11px] text-muted-2">
                            0{index + 1}
                          </span>
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-foreground">{step.title}</h3>
                        <p className="mt-2 text-[12px] leading-relaxed text-muted">{step.body}</p>
                      </CardContent>
                    </Card>
                  </SpotlightCard>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="border-t border-line/60 py-16">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal className="h-full">
              <SpotlightCard
                className="h-full rounded-2xl"
                spotlightColor="rgba(31, 138, 76, 0.14)"
              >
                <div className="h-full rounded-2xl border border-mint/20 bg-mint/[0.04] p-6">
              <ShieldCheck className="h-6 w-6 text-mint" />
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                Honest by default
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                {verifiedCount === 0
                  ? "None of the seeded places has a completed editorial verification yet. That is visible on every card instead of being hidden."
                  : `${verifiedCount} of ${places.length} places have completed editorial verification. The rest are clearly marked.`}{" "}
                Opening hours, entry fees, phone numbers and photos are only shown
                when they have a source. Ratings and reviews are never generated.
              </p>
              <Link
                href="/places"
                className="kv-focus mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-mint hover:text-emerald-700"
              >
                See the data status
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
                </div>
              </SpotlightCard>
            </Reveal>

            <Reveal className="h-full" delay={0.06}>
              <SpotlightCard className="h-full rounded-2xl">
                <div className="h-full rounded-2xl border border-line/80 bg-surface/50 p-6">
              <Database className="h-6 w-6 text-accent" />
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                One database, several front doors
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                The 3D explorer, 2D fallback, planner and assistant all read the
                same repository. That is why distances agree and why a place that
                is unverified in one surface is unverified everywhere.
              </p>
              <div className="mt-4 grid gap-2 text-[11px] text-muted-2 sm:grid-cols-2">
                <span className="rounded-lg border border-line/70 bg-surface/50 px-3 py-2">
                  {places.length} places · {seedCategories.length} categories
                </span>
                <span className="rounded-lg border border-line/70 bg-surface/50 px-3 py-2">
                  {seedTours.length} virtual tours
                </span>
                <span className="rounded-lg border border-line/70 bg-surface/50 px-3 py-2">
                  Drizzle ORM + PostGIS
                </span>
                <span className="rounded-lg border border-line/70 bg-surface/50 px-3 py-2">
                  Local fallback: zero config
                </span>
              </div>
              <p className="mt-3 text-[10px] text-muted-2">
                Place data is editorial seed content. Verify hours and fees with
                the official source before travelling.
              </p>
                </div>
              </SpotlightCard>
            </Reveal>
          </div>
        </section>
      </div>
    </>
  );
}
