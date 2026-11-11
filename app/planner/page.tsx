import { PlannerClient } from "@/components/planner/planner-client";
import { PageIntro } from "@/components/ui/section";
import { listPlaces } from "@/lib/db";
import { seedCategories } from "@/lib/data";
import { fetchWeather, weatherAdvice } from "@/lib/weather/open-meteo";

export const metadata = {
  title: "Trip planner",
  description:
    "Build a realistic Kandy itinerary around your time, budget, interests and walking pace. Honest estimates, verified hours only.",
};

export const revalidate = 900;

export default async function PlannerPage() {
  const places = await listPlaces();
  const weather = await fetchWeather();
  const advice = weather ? weatherAdvice(weather) : null;

  return (
    <>
      <PageIntro
        eyebrow="Planner"
        title="Turn a free afternoon into a walkable plan"
        description="Choose when you start, how long you have and what you care about. The planner orders real places by travel time, respects verified opening hours, and tells you when the day does not fit."
      />
      <PlannerClient
        places={places}
        categories={seedCategories}
        weather={advice}
      />
    </>
  );
}
