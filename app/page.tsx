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

// Unsplash royalty-free photography used for the editorial tourism aesthetic
// (source links maintained in the project notes for reuse and attribution).
const featuredSpots = [
  {
    title: "Temple of the Tooth",
    tag: "Sacred heritage",
    image:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
    copy: "Walk the spiritual heart of the city at the Dalada Maligawa.",
  },
  {
    title: "Kandy Lake",
    tag: "Scenic stroll",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    copy: "A reflective circuit with views across misty hills and colonial-era charm.",
  },
  {
    title: "Royal Botanic Gardens",
    tag: "Green escape",
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
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

export default function HomePage() {
  return (
    <div className="travel-home-shell">
      <section
        id="hero"
        data-scroll-section
        data-scroll-label="Discover"
        className="travel-hero"
      >
        <div className="travel-hero__image" aria-hidden="true">
          <Image
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
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
            {featuredSpots.map(({ title, tag, image, copy }) => (
              <Link
                key={title}
                href="/places"
                className="travel-story-card"
                aria-label={`Browse places related to ${title}`}
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
                  Discover places <ArrowRight size={14} />
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
              href="/places"
              className="travel-feature-card travel-feature-card--large"
              aria-label="Browse places in Kandy"
            >
              <Image
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
                alt="Misty mountain landscape in the hills"
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
                image:
                  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
              },
              {
                title: "Tea trails & tastings",
                detail: "A slower route across cool, green highlands and estate cafes.",
                image:
                  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
              },
              {
                title: "Lakefront sunrise walks",
                detail: "Quiet, reflective mornings as the city wakes to soft golden light.",
                image:
                  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80",
              },
            ].map(({ title, detail, image }) => (
              <Link
                key={title}
                href="/planner"
                className="travel-event-card"
                aria-label={`Plan a trip around ${title}`}
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
