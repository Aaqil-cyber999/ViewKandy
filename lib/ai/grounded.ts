import { formatDistance, formatDuration } from "@/lib/geo/distance";
import { findNearby, searchPlaces } from "@/lib/db/search";
import { generateItinerary } from "@/lib/planner/itinerary-generator";
import type { CategorySlug, Place } from "@/types/place";
import type { Itinerary } from "@/lib/planner/types";
import { fetchWeather, weatherAdvice } from "@/lib/weather/open-meteo";

export interface AssistantReply {
  answer: string;
  placeSlugs: string[];
  mode: "local" | "openai";
  suggestions: string[];
  itinerary?: Itinerary;
  sources: Array<{ label: string; url: string }>;
  notice?: string;
}

export interface AssistantContext {
  near?: { lat: number; lng: number };
  places: Place[];
}

const INTEREST_KEYWORDS: Array<{ category: CategorySlug; words: string[] }> = [
  { category: "heritage", words: ["history", "historic", "heritage", "kingdom", "palace", "colonial"] },
  { category: "religious", words: ["temple", "religious", "buddhist", "sacred", "church", "monastery", "worship"] },
  { category: "nature", words: ["nature", "garden", "forest", "green", "trees", "park", "lake"] },
  { category: "viewpoint", words: ["view", "viewpoint", "sunset", "panorama", "photo", "hills"] },
  { category: "museum", words: ["museum", "collection", "exhibit", "indoor"] },
  { category: "experience", words: ["experience", "dance", "show", "performance", "cooking", "culture"] },
  { category: "food", words: ["food", "eat", "restaurant", "cafe", "café", "curry", "coffee", "lunch", "dinner"] },
  { category: "shopping", words: ["shop", "shopping", "market", "souvenir", "mall"] },
];

const ALIASES: Array<{ slug: string; words: string[] }> = [
  { slug: "temple-of-the-sacred-tooth-relic", words: ["temple of the tooth", "sacred tooth", "dalada", "tooth temple", "tooth relic"] },
  { slug: "kandy-lake", words: ["kandy lake", "the lake", "lake round", "kiri muhuda"] },
  { slug: "bahirawakanda-buddha-statue", words: ["bahirawakanda", "buddha statue", "big buddha"] },
  { slug: "kandy-railway-station", words: ["railway station", "train station", "kandy station"] },
  { slug: "kandy-clock-tower", words: ["clock tower"] },
  { slug: "royal-botanic-gardens-peradeniya", words: ["botanical garden", "botanic garden", "peradeniya garden", "peradeniya"] },
  { slug: "udawattakele-forest-reserve", words: ["udawattakele", "forest reserve"] },
  { slug: "ceylon-tea-museum", words: ["tea museum", "ceylon tea"] },
  { slug: "rajapihilla-viewpoint", words: ["rajapihilla", "viewpoint", "view point"] },
  { slug: "kandy-city-centre", words: ["city centre", "city center", "mall"] },
  { slug: "national-museum-kandy", words: ["national museum"] },
  { slug: "kandy-central-market", words: ["central market", "market"] },
  { slug: "kandy-general-hospital", words: ["hospital", "emergency"] },
  { slug: "union-chemists-kandy", words: ["pharmacy", "chemist"] },
  { slug: "commercial-bank-atm-dalada-veediya", words: ["atm", "cash machine"] },
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s.'-]/gu, " ");
}

export function detectAnchor(text: string, places: Place[]): Place | undefined {
  const haystack = normalise(text);
  let best: { place: Place; length: number } | undefined;

  for (const alias of ALIASES) {
    for (const word of alias.words) {
      if (haystack.includes(word)) {
        const place = places.find((p) => p.slug === alias.slug);
        if (place && (!best || word.length > best.length)) {
          best = { place, length: word.length };
        }
      }
    }
  }

  for (const place of places) {
    const name = normalise(place.name);
    if (haystack.includes(name) && (!best || name.length > best.length)) {
      best = { place, length: name.length };
    }
  }
  return best?.place;
}

export function detectDurationMinutes(text: string): number | null {
  const haystack = text.toLowerCase();
  if (/\bhalf[- ]?day\b/.test(haystack)) return 240;
  if (/\bfull[- ]?day\b|\bwhole day\b|\bentire day\b/.test(haystack)) return 480;
  const hours = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/.exec(haystack);
  if (hours) {
    const value = Number(hours[1]);
    if (value >= 0.5 && value <= 14) return Math.round(value * 60);
  }
  const minutes = /(\d{2,3})\s*(?:minutes?|mins?)\b/.exec(haystack);
  if (minutes) {
    const value = Number(minutes[1]);
    if (value >= 30 && value <= 600) return value;
  }
  return null;
}

export function detectInterests(text: string): CategorySlug[] {
  const haystack = text.toLowerCase();
  const found = new Set<CategorySlug>();
  for (const entry of INTEREST_KEYWORDS) {
    if (entry.words.some((w) => haystack.includes(w))) found.add(entry.category);
  }
  return [...found];
}

export function detectBudget(text: string): number | null {
  const haystack = text.toLowerCase().replace(/,/g, "");
  const match = /(?:lkr|rs\.?|rupees?)\s*(\d{2,7})|(\d{2,7})\s*(?:lkr|rupees?)/.exec(haystack);
  if (match) {
    const value = Number(match[1] ?? match[2]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  if (/\b(cheap|budget|affordable|low cost)\b/.test(haystack)) return 3000;
  return null;
}

export function detectMode(text: string): "walk" | "drive" {
  return /\b(walk|walking|on foot|foot)\b/.test(text.toLowerCase()) ? "walk" : "drive";
}

function placeLine(place: Place, extra?: string): string {
  const suffix = extra ? ` — ${extra}` : "";
  return `- **${place.name}** · ${place.summary}${suffix}`;
}

function listAnswer(
  places: Array<Place & { distanceMeters?: number }>,
  intro: string,
  from?: { lat: number; lng: number },
): string {
  if (places.length === 0) {
    return `${intro}\n\nI could not find a matching place in the KandyVerse database. Try a broader interest or a different area.`;
  }
  const lines = places.map((p) => {
    const distance =
      from && typeof p.distanceMeters === "number" && Number.isFinite(p.distanceMeters)
        ? ` · ${formatDistance(p.distanceMeters)} away`
        : "";
    const hours = p.openingHours ? ` · hours: ${p.openingHours}` : " · hours not verified";
    return placeLine(p, `${distance.replace(/^ · /, "")}${hours}`.trim());
  });
  return `${intro}\n\n${lines.join("\n")}\n\n_Entry fees and hours are only shown when verified in the database. Tap a place card to see full details._`;
}

function itineraryAnswer(itinerary: Itinerary): string {
  if (itinerary.stops.length === 0) {
    return [
      "I could not fit any stops into that window with the current filters.",
      "",
      "Try a longer duration, fewer constraints, or start closer to the city centre.",
    ].join("\n");
  }

  const header = `**${formatDuration(itinerary.totals.totalMinutes)} in Kandy** · ${itinerary.start.label} · ${itinerary.startTime}–${itinerary.endTime}`;
  const lines = itinerary.stops.map((stop) => {
    const travel =
      stop.order === 1
        ? ""
        : ` · ${formatDistance(stop.travel.meters)} ${itinerary.mode === "walk" ? "walk" : "drive"} (est. ${stop.travel.minutes} min)`;
    return `${stop.order}. **${stop.place.name}** · ${clock(stop.arrivalMinutes)}–${clock(stop.departureMinutes)}${travel}`;
  });

  const budgetLine =
    itinerary.totals.estimatedTotalLkr > 0
      ? `Estimated spend: LKR ${itinerary.totals.estimatedTotalLkr.toLocaleString()} (${itinerary.totals.unknownEntryCostCount} entry fee${itinerary.totals.unknownEntryCostCount === 1 ? "" : "s"} unverified).`
      : "No verified costs apply; entry fees are unverified.";

  return [
    header,
    "",
    lines.join("\n"),
    "",
    `**Totals:** ${formatDuration(itinerary.totals.totalMinutes)} · ${formatDistance(itinerary.totals.travelMeters)} · ${budgetLine}`,
    "",
    `_${itinerary.assumptions[0]}_`,
    itinerary.warnings.length > 0 ? `\n**Before you go:** ${itinerary.warnings.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function clock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Deterministic, retrieval-grounded fallback assistant. It is intentionally
 * transparent: it only uses the KandyVerse database, real planner output and
 * live Open-Meteo data, and says so when information is missing.
 */
export async function answerLocally(
  message: string,
  context: AssistantContext,
): Promise<AssistantReply> {
  const text = message.trim();
  const lower = text.toLowerCase();
  const places = context.places;
  const anchor = detectAnchor(text, places);
  const interests = detectInterests(text);
  const duration = detectDurationMinutes(text);
  const budget = detectBudget(text);
  const mode = detectMode(text);
  const near = anchor ? { lat: anchor.lat, lng: anchor.lng } : context.near;

  const baseSuggestions = [
    "Plan 3 hours around the Temple of the Tooth",
    "What can I do near Kandy Lake?",
    "Where can I eat on a budget?",
    "Will it rain this afternoon?",
  ];

  if (!text) {
    return {
      answer: "Ask me about places, routes, timing or the weather in Kandy.",
      placeSlugs: [],
      mode: "local",
      suggestions: baseSuggestions,
      sources: [],
    };
  }

  if (/^(hi|hello|hey|ayubowan|good (morning|evening|afternoon))\b/.test(lower)) {
    return {
      answer:
        "Ayubowan! I'm the KandyVerse assistant. I work from the KandyVerse place database, the itinerary planner and live Open-Meteo weather — I won't invent opening hours or prices.\n\nTell me how much time you have, what you're interested in, and where you're starting.",
      placeSlugs: [],
      mode: "local",
      suggestions: baseSuggestions,
      sources: [],
    };
  }

  const wantsWeather = /\b(weather|rain|raining|temperature|forecast|sunny|cloudy)\b/.test(lower);
  if (wantsWeather) {
    const weather = await fetchWeather();
    if (!weather) {
      return {
        answer:
          "The Open-Meteo weather service is unreachable right now, so I won't guess the conditions. You can retry from the weather panel on the home page.",
        placeSlugs: [],
        mode: "local",
        suggestions: baseSuggestions,
        sources: [{ label: "Open-Meteo", url: "https://open-meteo.com/" }],
      };
    }
    const advice = weatherAdvice(weather);
    const indoor = searchPlaces(places, { categories: ["museum", "religious", "shopping"], limit: 4 });
    const slugs = advice.rainLikely ? indoor.map((p) => p.slug) : [];
    return {
      answer: [
        `**Now in Kandy:** ${Math.round(weather.current.temperatureC)}°C, ${weather.current.condition.label.toLowerCase()}, feels like ${Math.round(weather.current.apparentC)}°C.`,
        `Humidity ${weather.current.humidity}% · wind ${Math.round(weather.current.windKmh)} km/h · rain probability next hours up to ${Math.max(...weather.hourly.slice(0, 6).map((h) => h.precipitationProbability))}%.`,
        "",
        advice.headline,
        advice.rainLikely ? advice.indoorAdvice : advice.outdoorAdvice,
        "",
        `_Source: Open-Meteo (CC BY 4.0), fetched ${new Date(weather.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}._`,
      ].join("\n"),
      placeSlugs: slugs,
      mode: "local",
      suggestions: baseSuggestions,
      sources: [{ label: "Open-Meteo", url: "https://open-meteo.com/" }],
    };
  }

  const wantsPlan =
    /\b(plan|itinerary|schedule|route|things to do|what can i do|what should i (do|visit|see)|in \d+ (hours?|hrs?))\b/.test(
      lower,
    ) || duration !== null;

  if (wantsPlan) {
    const itinerary = generateItinerary(places, {
      startPlaceSlug: anchor?.slug ?? null,
      start: anchor
        ? { lat: anchor.lat, lng: anchor.lng, label: anchor.name }
        : { lat: 7.2906, lng: 80.6337, label: "Kandy city centre" },
      startTime: "09:00",
      availableMinutes: duration ?? 240,
      interests,
      budgetLkr: budget,
      travelMode: mode,
      pace: "balanced",
      includeMeal: (duration ?? 240) >= 240 || interests.includes("food"),
      accessibilityNeeded: /\b(accessib|wheelchair|step-free|mobility)\b/.test(lower),
      groupType: /\bfamily|kids|children\b/.test(lower) ? "family" : "couple",
      groupSize: /\bfamily|kids|children\b/.test(lower) ? 4 : 2,
    });

    return {
      answer: itineraryAnswer(itinerary),
      placeSlugs: itinerary.stops.map((s) => s.place.slug),
      mode: "local",
      suggestions: [
        "Make it a walking plan",
        "Add a food stop",
        "What is near the Temple of the Tooth?",
        "Show me the weather",
      ],
      itinerary,
      sources: [],
      notice: "Generated by the deterministic KandyVerse planner from database places.",
    };
  }

  const wantsNearby = /\b(near|nearby|around|close to|next to|walking distance)\b/.test(lower);
  if (wantsNearby) {
    if (!near) {
      return {
        answer:
          "Tell me which place you're near — for example “near Kandy Lake” or “near the railway station” — and I'll list what's within walking distance.",
        placeSlugs: [],
        mode: "local",
        suggestions: baseSuggestions,
        sources: [],
      };
    }
    const results = findNearby(places, near, 1500, interests.length ? interests : undefined, 7);
    return {
      answer: listAnswer(
        results,
        anchor
          ? `Within about 1.5 km of **${anchor.name}**${interests.length ? ` (${interests.join(", ")})` : ""}:`
          : "Within about 1.5 km of your position:",
        near,
      ),
      placeSlugs: results.map((p) => p.slug),
      mode: "local",
      suggestions: baseSuggestions,
      sources: [],
    };
  }

  const wantsServices = /\b(atm|toilet|pharmacy|hospital|doctor|police|parking|bus|train|transport)\b/.test(lower);
  if (wantsServices) {
    const categories: CategorySlug[] = [];
    if (/\batm|cash|money\b/.test(lower)) categories.push("services");
    if (/\bpharmacy|hospital|doctor|medical\b/.test(lower)) categories.push("health");
    if (/\bbus|train|transport\b/.test(lower)) categories.push("transport");
    if (/\btoilet|washroom|restroom\b/.test(lower)) categories.push("services");
    const results = findNearby(
      places,
      near ?? { lat: 7.2906, lng: 80.6337 },
      2500,
      categories.length ? categories : ["services", "health", "transport"],
      7,
    );
    return {
      answer: listAnswer(
        results,
        "Practical services in central Kandy (distances are straight-line estimates):",
        near,
      ),
      placeSlugs: results.map((p) => p.slug),
      mode: "local",
      suggestions: baseSuggestions,
      sources: [],
    };
  }

  if (anchor && (/\b(about|tell me|what is|where is|details|open|opening|fee|price|entry)\b/.test(lower) || text.length < 40)) {
    const nearby = findNearby(places, anchor, 1200, undefined, 4).filter((p) => p.slug !== anchor.slug);
    const details = [
      `**${anchor.name}** · ${anchor.summary}`,
      "",
      anchor.description,
      "",
      `- Category: ${anchor.category}`,
      `- Location: ${anchor.address ?? "Kandy"} (${anchor.lat.toFixed(4)}, ${anchor.lng.toFixed(4)})`,
      `- Opening hours: ${anchor.openingHours ?? "not verified"}`,
      `- Entry fee: ${anchor.entryFeeLkr !== null ? `LKR ${anchor.entryFeeLkr.toLocaleString()}` : "not verified"}`,
      `- Suggested visit: about ${formatDuration(anchor.estimatedVisitMinutes)}`,
      anchor.accessibility ? `- Access: ${anchor.accessibility}` : "",
      anchor.practicalNotes ? `- Practical: ${anchor.practicalNotes}` : "",
      `- Data status: ${anchor.verification.status.replace("_", " ")} · source: ${anchor.verification.source}`,
      anchor.website ? `- Official site: ${anchor.website}` : "",
    ].filter(Boolean);

    if (nearby.length > 0) {
      details.push("", "**Nearby:**", ...nearby.map((p) => placeLine(p, formatDistance(p.distanceMeters))));
    }
    return {
      answer: details.join("\n"),
      placeSlugs: [anchor.slug, ...nearby.map((p) => p.slug)],
      mode: "local",
      suggestions: baseSuggestions,
      sources: anchor.website ? [{ label: `${anchor.name} official website`, url: anchor.website }] : [],
    };
  }

  if (/\b(open|opening|hours|close|closing)\b/.test(lower)) {
    const withHours = places.filter((p) => p.openingHours);
    return {
      answer:
        withHours.length === 0
          ? "No opening hours are verified in the KandyVerse database yet, so I won't guess them. Check the official website for the place you plan to visit — the Temple of the Tooth and the museums are the ones most likely to change schedules."
          : listAnswer(withHours.slice(0, 6), "These are the places with verified hours:"),
      placeSlugs: withHours.slice(0, 6).map((p) => p.slug),
      mode: "local",
      suggestions: baseSuggestions,
      sources: [],
    };
  }

  if (/\b(budget|cheap|cost|price|afford)\b/.test(lower)) {
    const free = searchPlaces(places, { q: "free", limit: 5 });
    return {
      answer: [
        "Most of Kandy's best experiences are free to walk: the lake loop, the viewpoint roads and the city centre.",
        "Verified entry fees are sparse in the database, so I won't invent prices. The planner includes only verified fees and labels every estimate.",
        "",
        free.length > 0 ? "**Free or low-cost starting points:**" : "",
        ...free.map((p) => placeLine(p)),
        "",
        `_Estimate used for meals: LKR 1,200 per person; tuk-tuk: LKR 120/km. These are planning assumptions, not quotes._`,
      ]
        .filter(Boolean)
        .join("\n"),
      placeSlugs: free.map((p) => p.slug),
      mode: "local",
      suggestions: baseSuggestions,
      sources: [],
    };
  }

  const query = interests.length > 0 ? "" : text.replace(/[?.!]/g, "");
  const results = searchPlaces(places, {
    q: query,
    categories: interests.length > 0 ? interests : undefined,
    limit: 6,
    near,
  });

  if (results.length === 0) {
    return {
      answer:
        "I couldn't match that to a place in the KandyVerse database. I only recommend places that are actually in the dataset — try a category like heritage, temples, nature, viewpoints or food.",
      placeSlugs: [],
      mode: "local",
      suggestions: baseSuggestions,
      sources: [],
    };
  }

  return {
    answer: listAnswer(
      results,
      interests.length > 0
        ? `Here are ${interests.join(", ")} places in Kandy:`
        : "Here's what matches in Kandy:",
      near,
    ),
    placeSlugs: results.map((p) => p.slug),
    mode: "local",
    suggestions: baseSuggestions,
    sources: [],
  };
}
