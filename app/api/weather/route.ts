import { fetchWeather } from "@/lib/weather/open-meteo";

export const revalidate = 900;

export async function GET() {
  const weather = await fetchWeather();
  if (!weather) {
    return Response.json(
      {
        error: "Weather service unavailable.",
        detail: "Open-Meteo could not be reached. No cached or estimated values are shown.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(weather, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300" },
  });
}
