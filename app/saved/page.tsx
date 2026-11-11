import { SavedClient } from "@/components/saved/saved-client";
import { PageIntro } from "@/components/ui/section";
import { listPlaces } from "@/lib/db";

export const metadata = {
  title: "Saved places & plans",
  description:
    "Your saved Kandy places, itineraries and trip shortlist, stored locally on this device.",
};

export default async function SavedPage() {
  const places = await listPlaces();
  return (
    <>
      <PageIntro
        eyebrow="Your collection"
        title="Saved places, plans and pins"
        description="Everything here is stored in this browser. Nothing is sent to a server unless you sign in with a configured Supabase project."
      />
      <SavedClient places={places} />
    </>
  );
}
