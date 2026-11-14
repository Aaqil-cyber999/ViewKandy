import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export default function StyleGuidePage() {
  return (
    <div
      id="design-system"
      data-scroll-section
      data-scroll-label="Design system"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mb-10">
        <p className="travel-eyebrow travel-eyebrow--dark">Design system</p>
        <h1 className="mt-4 font-display text-5xl tracking-[-0.06em] text-slate-900">
          View Kandy style guide
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)]">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <button className="travel-button travel-button--primary">Primary CTA</button>
            <button className="travel-button travel-button--ghost">Secondary</button>
            <button className="rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
              Default
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)]">
          <h2 className="mb-5 text-xl font-semibold">Dark section</h2>
          <div className="flex flex-wrap gap-3">
            <span className="travel-badge">Cultural gems</span>
            <span className="travel-badge">Nature trails</span>
            <span className="travel-badge">Lakefront strolls</span>
          </div>
        </section>
      </div>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)]">
        <h2 className="mb-5 text-xl font-semibold text-slate-900">Cards</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Heritage walks",
            "Tea-country loops",
            "Lakefront escapes",
          ].map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-[#f4f6f5] p-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dfece9] text-[#0f5d67]">
                <Sparkles size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{item}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Premium editorial storytelling with soft contrast and clear hierarchy.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)]">
        <h2 className="mb-5 text-xl font-semibold text-slate-900">Links and chips</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/places" className="travel-link">
            See all places
            <ArrowRight size={16} />
          </Link>
          <span className="rounded-full border border-[#d7d0be] bg-[#f7f1e7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
            Verified stays
          </span>
          <span className="rounded-full border border-[#dfece9] bg-[#edf7f5] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f5d67]">
            Fast route
          </span>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_18px_50px_-30px_rgba(7,29,45,0.45)]">
        <h2 className="mb-5 text-xl font-semibold text-slate-900">Accessibility</h2>
        <ul className="space-y-3 text-sm text-slate-700">
          {[
            "Large tap targets with visible focus rings",
            "Semantic button and link states",
            "High contrast text on light and dark surfaces",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle2 className="text-[#0f5d67]" size={18} />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
