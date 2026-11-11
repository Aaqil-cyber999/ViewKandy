import { PlacesBrowser } from "@/components/places/places-browser";
import { PageIntro } from "@/components/ui/section";
import { listPlaces } from "@/lib/db";
import { seedCategories } from "@/lib/data";

export const metadata = {
  title: "Places in Kandy",
  description:
    "Browse the KandyVerse editorial database: heritage, temples, nature, viewpoints, museums, food, services and more.",
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
      <PlacesBrowser
        places={places}
        categories={seedCategories}
        initialCategory={category}
      />
    </>
  );
}
