import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MapPinned,
  Sparkles,
  Star,
  Trees,
} from "lucide-react";
import { HeroSlideshow } from "@/components/home/hero-slideshow";

// Real Kandy photography supplied with the project. Each image is tied to the
// destination it actually depicts; no stock stand-ins are used here.
const featuredSpots = [
  {
    title: "Temple of the Tooth",
    tag: "Sacred heritage",
    image: "/places/temple-of-the-sacred-tooth-relic.jpg",
    href: "/places/temple-of-the-sacred-tooth-relic",
    copy: "Walk the spiritual heart of the city at the Dalada Maligawa.",
  },
  {
    title: "Kandy Lake",
    tag: "Scenic stroll",
    image: "/places/kandy-lake.jpg",
    href: "/places/kandy-lake",
    copy: "A reflective circuit with views across misty hills and colonial-era charm.",
  },
  {
    title: "Royal Botanic Gardens",
    tag: "Green escape",
    image: "/places/royal-botanic-gardens-peradeniya.webp",
    href: "/places/royal-botanic-gardens-peradeniya",
    copy: "A botanical wonder of orchids, palm avenues and cool mountain air.",
  },
];

const quickPicks = [
  { title: "Cultural gems", icon: Sparkles, tone: "gold" },
  { title: "Nature trails", icon: Trees, tone: "teal" },
  { title: "Lakefront moments", icon: MapPinned, tone: "blue" },
  { title: "Festivals & events", icon: CalendarDays, tone: "sand" },
];

const experiences = [
  "Temple & heritage walks",
  "Sunrise viewpoints",
  "Tea garden escapes",
  "Night markets & street food",
  "Wellness retreats",
  "Adventure & hiking",
];

const plannerSteps = [
  { label: "Map your route", value: "01" },
  { label: "Choose the mood", value: "02" },
  { label: "Save what matters", value: "03" },
];

// Homepage hero backgrounds supplied in places pics/homepage; rotated with a
// smooth crossfade. Order is deliberate for a gentle progression.
const heroImages = [
  { src: "/homepage/homepage.jpg", alt: "Kandy hillside scenery" },
  { src: "/homepage/homepage1.jpg", alt: "Scenic view in Kandy" },
  { src: "/homepage/homepage2.jpg", alt: "Kandy landscape" },
  { src: "/homepage/homepage3.jpg", alt: "View around Kandy" },
  { src: "/homepage/homepage4.jpg", alt: "Kandy surroundings" },
  { src: "/homepage/homepage6.jpg", alt: "Green hills near Kandy" },
  { src: "/homepage/homepage7.jpg", alt: "Kandy cityscape view" },
  { src: "/homepage/homepage8.jpg", alt: "Atmospheric scene in Kandy" },
];

export default function HomePage() {
  return (
    <div className="travel-home-shell">
      <section
        id="hero"
        data-scroll-section
        data-scroll-label="Discover"
        className="travel-hero"
      >
        <HeroSlideshow
          images={heroImages}
          className="travel-hero__image"
        />
        <div className="travel-hero__overlay" aria-hidden="true" />

        <div className="travel-hero__content mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="travel-eyebrow">A slower, richer way to explore Kandy</p>
            <h1 className="travel-display">Discover the soul of Sri Lanka in Kandy.</h1>
            <p className="travel-lede">
              Trace sacred temples, mist-wrapped hills, lakeside walks, and unforgettable
              cultural evenings across one of the island’s most atmospheric cities.
            </p>
            <div className="travel-actions">
              <Link href="/explore" className="travel-button travel-button--primary">
                Start exploring
                <ArrowRight size={16} />
              </Link>
              <Link href="/planner" className="travel-button travel-button--ghost">
                Plan your trip
              </Link>
            </div>
          </div>

          <div className="travel-hero__stats" aria-label="Kandy highlights">
            <div>
              <span>Temple of the Tooth</span>
              <strong>1 city, 1 heritage</strong>
            </div>
            <div>
              <span>Lakefront</span>
              <strong>6.5 km circuit</strong>
            </div>
            <div>
              <span>Climate</span>
              <strong>Cool hills, warm evenings</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="travel-main">
        <section
          id="overview"
          data-scroll-section
          data-scroll-label="Overview"
          className="travel-shell travel-shell--light"
        >
          <div className="travel-section-head">
            <div>
              <p className="travel-eyebrow travel-eyebrow--dark">Everything you need</p>
              <h2>One beautiful journey.</h2>
            </div>
            <Link href="/places" className="travel-link">
              See all places
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="travel-quick-grid">
            {quickPicks.map(({ title, icon: Icon, tone }) => (
              <Link
                key={title}
                href="/explore"
                className={`travel-mini-card travel-mini-card--${tone}`}
                aria-label={`Explore ${title.toLowerCase()} on the map`}
              >
                <div className="travel-mini-card__icon">
                  <Icon size={18} />
                </div>
                <div>
                  <strong>{title}</strong>
                  <span>Curated highlights</span>
                </div>
                <ArrowRight className="travel-mini-card__arrow" size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section
          id="stories"
          data-scroll-section
          data-scroll-label="Stories"
          className="travel-shell travel-shell--dark"
        >
          <div className="travel-section-head travel-section-head--dark">
            <div>
              <p className="travel-eyebrow">What’s new</p>
              <h2>Stories that guide your Kandy stay.</h2>
            </div>
            <Link href="/tours" className="travel-link travel-link--light">
              Explore more
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="travel-story-grid">
            {featuredSpots.map(({ title, tag, image, href, copy }) => (
              <Link
                key={title}
                href={href}
                className="travel-story-card"
                aria-label={`Read about ${title}`}
              >
                <div className="travel-story-card__media">
                  <Image src={image} alt={title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="travel-story-card__body">
                  <span>{tag}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
                <span className="travel-card-cta" aria-hidden="true">
                  Open the guide <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          id="places"
          data-scroll-section
          data-scroll-label="Places"
          className="travel-shell travel-shell--light"
        >
          <div className="travel-section-head">
            <div>
              <p className="travel-eyebrow travel-eyebrow--dark">Best places</p>
              <h2>Discover Kandy at its most memorable.</h2>
            </div>
            <Link href="/places" className="travel-link">
              View all places
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="travel-feature-layout">
            <Link
              href="/places/temple-of-the-sacred-tooth-relic"
              className="travel-feature-card travel-feature-card--large"
              aria-label="Read about the Temple of the Sacred Tooth Relic"
            >
              <Image
                src="/places/temple-of-the-sacred-tooth-relic.jpg"
                alt="The Temple of the Sacred Tooth Relic in Kandy"
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
              <div className="travel-feature-card__content">
                <span>Temple & heritage</span>
                <h3>Ayubowan: a warm Kandy welcome</h3>
              </div>
            </Link>

            <div className="travel-spot-stack">
              {[
                "Misty viewpoints",
                "Tea country roads",
                "Kandy Lake promenade",
                "Hidden village stays",
              ].map((item) => (
                <div key={item} className="travel-spot-row">
                  <span className="travel-dot" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="experiences"
          data-scroll-section
          data-scroll-label="Experiences"
          className="travel-shell travel-shell--dark travel-shell--experience"
        >
          <div className="travel-section-head travel-section-head--dark">
            <div>
              <p className="travel-eyebrow">Experiences for every explorer</p>
              <h2>Find the rhythm that fits your trip.</h2>
            </div>
          </div>

          <div className="travel-badge-grid">
            {experiences.map((item) => (
              <span key={item} className="travel-badge">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section
          id="events"
          data-scroll-section
          data-scroll-label="Events"
          className="travel-shell travel-shell--light"
        >
          <div className="travel-section-head">
            <div>
              <p className="travel-eyebrow travel-eyebrow--dark">Upcoming events</p>
              <h2>Seasonal moments worth planning around.</h2>
            </div>
            <Link href="/planner" className="travel-link">
              Build my route
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="travel-event-grid">
            {[
              {
                title: "Esala Perahera",
                detail: "Cultural pageantry, drumming and temple processions at night.",
                image: "/places/temple-of-the-sacred-tooth-relic.jpg",
                href: "/places/temple-of-the-sacred-tooth-relic",
              },
              {
                title: "Tea trails & tastings",
                detail: "A slower route across cool, green highlands and estate cafes.",
                image: "/places/ceylon-tea-museum.jpg",
                href: "/places/ceylon-tea-museum",
              },
              {
                title: "Lakefront sunrise walks",
                detail: "Quiet, reflective mornings as the city wakes to soft golden light.",
                image: "/places/kandy-lake.jpg",
                href: "/places/kandy-lake",
              },
            ].map(({ title, detail, image, href }) => (
              <Link
                key={title}
                href={href}
                className="travel-event-card"
                aria-label={`Read about ${title}`}
              >
                <div className="travel-event-card__media">
                  <Image src={image} alt={title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="travel-event-card__body">
                  <div className="travel-event-card__meta">
                    <Star size={14} />
                    <span>Seasonal highlight</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
                <span className="travel-card-cta" aria-hidden="true">
                  Plan around this <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          id="reviews"
          data-scroll-section
          data-scroll-label="Reviews"
          className="travel-shell travel-shell--review"
        >
          <div className="travel-review">
            <p className="travel-eyebrow travel-eyebrow--dark">What our guests say</p>
            <h2>“Kandy feels intimate, cinematic and deeply alive.”</h2>
            <div className="travel-review__meta">
              <span>•</span>
              <span>Curated by travellers for travellers</span>
            </div>
          </div>
        </section>

        <section
          id="plan"
          data-scroll-section
          data-scroll-label="Plan"
          className="travel-shell travel-shell--cta"
        >
          <div className="travel-cta-panel">
            <div>
              <p className="travel-eyebrow travel-eyebrow--dark">Plan with ease</p>
              <h2>Build a stay that moves with the city.</h2>
            </div>

            <div className="travel-cta-steps" aria-label="Planning steps">
              {plannerSteps.map((step) => (
                <div key={step.label} className="travel-cta-step">
                  <span>{step.value}</span>
                  <strong>{step.label}</strong>
                </div>
              ))}
            </div>

            <div className="travel-cta-actions">
              <Link href="/planner" className="travel-button travel-button--primary">
                Start planning
                <ArrowRight size={16} />
              </Link>
              <Link href="/explore" className="travel-button travel-button--ghost-dark">
                Explore the map
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
