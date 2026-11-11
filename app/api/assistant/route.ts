import type { NextRequest } from "next/server";
import { answerLocally } from "@/lib/ai/grounded";
import { answerWithOpenAI } from "@/lib/ai/openai";
import { listPlaces } from "@/lib/db";
import { assistantRequestSchema } from "@/lib/validation/schemas";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/utils/rate-limit";
import type { Place } from "@/types/place";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function placeCard(place: Place) {
  return {
    slug: place.slug,
    name: place.name,
    category: place.category,
    summary: place.summary,
    lat: place.lat,
    lng: place.lng,
    estimatedVisitMinutes: place.estimatedVisitMinutes,
    entryFeeLkr: place.entryFeeLkr,
    openingHours: place.openingHours,
    verification: place.verification.status,
    website: place.website,
  };
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(clientKey(request, "assistant"), 20, 60_000);
  if (!limited.allowed) return tooManyRequests(limited);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = assistantRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid message.", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const places = await listPlaces();
  const { message, history, near } = parsed.data;

  let reply;
  if (process.env.OPENAI_API_KEY) {
    try {
      reply = await answerWithOpenAI({ message, history: history ?? [], places });
    } catch (error) {
      console.error("[assistant] OpenAI failed, falling back to grounded engine:", error);
      reply = await answerLocally(message, { places, near });
      reply = {
        ...reply,
        notice:
          "The AI model is temporarily unavailable, so this answer was produced by the deterministic KandyVerse retrieval engine.",
      };
    }
  } else {
    reply = await answerLocally(message, { places, near });
    reply = {
      ...reply,
      notice:
        reply.notice ??
        "Grounded mode: answers come from the KandyVerse database and planner. Set OPENAI_API_KEY to enable conversational AI.",
    };
  }

  const bySlug = new Map(places.map((p) => [p.slug, p]));
  const cards = reply.placeSlugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is Place => Boolean(p))
    .map(placeCard);

  return Response.json(
    {
      answer: reply.answer,
      mode: reply.mode,
      places: cards,
      itinerary: reply.itinerary ?? null,
      suggestions: reply.suggestions,
      sources: reply.sources,
      notice: reply.notice,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
