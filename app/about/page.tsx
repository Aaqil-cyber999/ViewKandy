import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, MapPin, Mountain, Sparkles } from "lucide-react";
import { PageIntro } from "@/components/ui/section";

// Real Kandy photography supplied with the project adds local texture to the
// editorial cards without pretending to be a different destination.
const values = [
  {
    title: "Cultural depth",
    copy: "Kandy reveals itself in layers: temple rituals, heritage lanes, tea estates and intimate local evenings.",
    icon: Sparkles,
    image: "/places/temple-of-the-sacred-tooth-relic.jpg",
  },
  {
    title: "Slow travel design",
    copy: "Every route is built for pacing, not pressure — immersive enough to linger and practical enough to navigate.",
    icon: Compass,
    image: "/places/kandy-lake.jpg",
  },
  {
    title: "Natural rhythm",
    copy: "Mist, lakes, ridgelines and seasonal weather all shape the way Kandy feels from one hour to the next.",
    icon: Mountain,
    image: "/places/hantana-viewpoint.jpg",
  },
];

const stats = [
  { value: "7.3°N", label: "latitude" },
  { value: "80.6°E", label: "longitude" },
  { value: "24+", label: "key places" },
  { value: "4", label: "travel moods" },
];

export const metadata = {
  title: "About Kandy",
  description: "Learn the story behind View Kandy and the slow, layered way we guide travelers through Kandy.",
};

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="Our story"
        title="Curating Kandy at the speed of discovery"
        description="View Kandy brings together real coordinates, honest editorial context and a calmer way to explore the city beyond the usual checklist."
      />

      <section
        id="story"
        data-scroll-section
        data-scroll-label="Our story"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)]">
            <div className="relative h-[420px] w-full">
              <Image
                src="/places/udawattakele-forest-reserve.jpg"
                alt="Forest in the Udawattakele Reserve above Kandy"
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#081d2c]/65 via-[#081d2c]/10 to-transparent" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-line bg-gradient-to-br from-surface to-canvas p-6 shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)]">
            <p className="travel-eyebrow travel-eyebrow--dark">Why Kandy</p>
            <h2 className="mt-4 font-display text-4xl tracking-[-0.05em] text-foreground">
              A city shaped by rituals, weather and view lines.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              The city balances sacred heritage with misty hills, winding roads and a calm lakeside rhythm. We designed the experience to feel immersive and practical at once.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className="kv-metric-card p-4">
                  <div className="font-display text-3xl text-foreground">{stat.value}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="values"
        data-scroll-section
        data-scroll-label="Our values"
        className="travel-shell travel-shell--light"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
              {values.map(({ title, copy, icon: Icon, image }) => (
              <article key={title} className="group overflow-hidden rounded-[1.75rem] border border-line bg-surface/95 shadow-[0_18px_40px_-30px_rgba(7,29,45,0.4)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_54px_-32px_rgba(7,29,45,0.58)]">
                <div className="relative h-44 overflow-hidden">
                  <Image src={image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071d2d]/55 via-[#0f5d67]/10 to-transparent" />
                  <span className="absolute bottom-4 left-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/40 bg-white/90 text-accent shadow-lg backdrop-blur">
                    <Icon size={18} />
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-3xl tracking-[-0.04em] text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="planning"
        data-scroll-section
        data-scroll-label="Planning thoughtfully"
        className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8"
      >
        <div className="rounded-[2rem] border border-line bg-forest px-6 py-8 text-white shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)] md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="travel-eyebrow">Planning thoughtfully</p>
              <h2 className="mt-4 max-w-xl font-display text-4xl tracking-[-0.05em] text-white">
                Built for travelers who prefer texture over noise.
              </h2>
            </div>
            <Link href="/contact" className="travel-button travel-button--primary w-fit">
              Contact the guide
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
