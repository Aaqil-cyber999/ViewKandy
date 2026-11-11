import { AssistantChat } from "@/components/assistant/assistant-chat";
import { PageIntro } from "@/components/ui/section";

export const metadata = {
  title: "AI assistant",
  description:
    "Ask the KandyVerse guide for grounded answers about Kandy places, plans, food, weather and practical services.",
};

export default function AssistantPage() {
  return (
    <>
      <PageIntro
        eyebrow="Grounded assistant"
        title="Ask a guide that checks the database first"
        description="The assistant can search places, find nearby services, build a time-boxed itinerary, read live weather and look up distances. When a fact is missing from the database, it says so instead of filling the gap."
      />
      <AssistantChat />
    </>
  );
}
