import { PlacesBrowser } from "@/components/places/places-browser";
import { PageIntro } from "@/components/ui/section";
import { listPlaces } from "@/lib/db";
import { seedCategories } from "@/lib/data";

const statCards = [
  { label: "Verified entries", value: "24+" },
  { label: "Heritage sites", value: "8" },
  { label: "Nature loops", value: "6" },
  { label: "Good for easy days", value: "4" },
];

export const metadata = {
  title: "Places in Kandy",
  description:
    "Browse the View Kandy editorial database: heritage, temples, nature, viewpoints, museums, food, services and more.",
};

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, places] = await Promise.all([searchParams, listPlaces()]);

  return (
    <>
      <PageIntro
        eyebrow="The database"
        title="Places that actually exist"
        description="Every entry has real coordinates and an editorial summary. Hours, entry fees and contact details appear only when a source has been recorded. Nothing here is generated to fill a gap."
      />

      <section
        id="place-stats"
        data-scroll-section
        data-scroll-label="Highlights"
        className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8"
      >
        <div className="grid gap-4 md:grid-cols-4">
          {statCards.map((item) => (
            <div key={item.label} className="kv-metric-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                {item.label}
              </p>
              <p className="mt-3 font-display text-3xl text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="directory" data-scroll-section data-scroll-label="Directory">
        <PlacesBrowser
          places={places}
          categories={seedCategories}
          initialCategory={category}
        />
      </section>
    </>
  );
}
