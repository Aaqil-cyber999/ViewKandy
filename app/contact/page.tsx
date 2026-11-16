import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { PageIntro } from "@/components/ui/section";

// Real Kandy photography supplied with the project gives each contact card its
// own local accent while keeping the information readable over a tinted overlay.
const cards = [
  {
    title: "Visit",
    copy: "Kandy, Central Province, Sri Lanka",
    icon: MapPin,
    image: "/places/kandy-city-centre.jpg",
  },
  {
    title: "Call",
    copy: "+94 76 200 4125",
    icon: Phone,
    image: "/places/kandy-railway-station.jpg",
  },
  {
    title: "Email",
    copy: "hello@viewkandy.lk",
    icon: Mail,
    image: "/places/national-museum-kandy.jpg",
  },
];

export const metadata = {
  title: "Contact View Kandy",
  description: "Get in touch for travel planning, recommendations, or editorial inquiries for Kandy.",
};

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Ask for a route, a recommendation, or a slower day in Kandy"
        description="We help travelers shape a route based on interests, pace and weather — with real places, honest notes and a lens tuned to Kandy’s mood."
      />

      <section
        id="contact-options"
        data-scroll-section
        data-scroll-label="Contact options"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map(({ title, copy, icon: Icon, image }) => (
            <div key={title} className="group overflow-hidden rounded-[1.75rem] border border-line bg-surface/95 shadow-[0_18px_40px_-30px_rgba(7,29,45,0.4)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_54px_-32px_rgba(7,29,45,0.58)]">
              <div className="relative h-40">
                <Image src={image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071d2d]/60 via-[#0f5d67]/15 to-transparent" />
                <span className="absolute bottom-4 left-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/40 bg-white/90 text-accent shadow-lg backdrop-blur">
                  <Icon size={18} />
                </span>
              </div>
              <div className="p-6">
                <h3 className="font-display text-3xl tracking-[-0.04em] text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-line bg-gradient-to-br from-surface to-canvas p-6 shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="travel-eyebrow travel-eyebrow--dark">Plan a visit</p>
              <h2 className="mt-4 font-display text-4xl tracking-[-0.05em] text-foreground">
                Share your pace, interests and timing.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                Whether you want a heritage day, a lakeside circuit, or a short route for one afternoon, we can tailor a more thoughtful Kandy plan.
              </p>
            </div>

            <form
              action="mailto:hello@viewkandy.lk"
              method="post"
              encType="text/plain"
              className="space-y-4 rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_14px_36px_-28px_rgba(7,29,45,0.4)]"
            >
              <div>
                <label htmlFor="contact-name" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Name</label>
                <input id="contact-name" name="Name" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-[#0f5d67]" placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="contact-email" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Email</label>
                <input id="contact-email" name="Email" type="email" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-[#0f5d67]" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="contact-message" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Message</label>
                <textarea id="contact-message" name="Message" rows={4} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-[#0f5d67]" placeholder="Tell us what kind of Kandy day you want." />
              </div>
              <button type="submit" className="travel-button travel-button--primary w-full">
                Send inquiry
                <ArrowRight size={16} />
              </button>
              <p className="text-xs text-slate-500">
                Submitting opens your email app with the inquiry details.
              </p>
            </form>
          </div>
        </div>
      </section>

      <section
        id="planner-cta"
        data-scroll-section
        data-scroll-label="Plan your visit"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
      >
        <div className="rounded-[2rem] border border-line bg-forest px-6 py-8 text-white shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)] md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="travel-eyebrow">Need a route now?</p>
              <h2 className="mt-3 font-display text-4xl tracking-[-0.05em] text-white">Jump into the planner.</h2>
            </div>
            <Link href="/planner" className="travel-button travel-button--primary w-fit">
              Open planner
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
