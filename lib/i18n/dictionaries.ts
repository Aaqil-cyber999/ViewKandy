export type Locale = "en" | "si" | "ta";

export const LOCALES: Array<{ code: Locale; label: string; native: string }> = [
  { code: "en", label: "English", native: "English" },
  { code: "si", label: "Sinhala", native: "සිංහල" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
];

const en: Record<string, string> = {
  "nav.explore": "Explore",
  "nav.places": "Places",
  "nav.planner": "Plan a trip",
  "nav.assistant": "AI assistant",
  "nav.tours": "Virtual tours",
  "nav.saved": "Saved",
  "common.search": "Search",
  "common.searchPlaces": "Search places, food, temples…",
  "common.planTrip": "Plan my trip",
  "common.exploreKandy": "Explore Kandy",
  "common.viewAll": "View all",
  "common.save": "Save",
  "common.saved": "Saved",
  "common.route": "Route",
  "common.navigate": "Navigate",
  "common.details": "Details",
  "common.loading": "Loading",
  "common.estimated": "Estimate",
  "common.unverified": "Unverified",
  "common.verified": "Verified",
  "common.min": "min",
  "common.hours": "hours",
  "home.eyebrow": "Kandy, Sri Lanka · 7.2906° N, 80.6337° E",
  "home.title": "Explore Kandy beyond the map",
  "home.subtitle":
    "Fly over the lake and the hills, find places that actually exist, and turn a few free hours into a plan you can walk.",
  "home.ctaPrimary": "Explore in 3D",
  "home.ctaSecondary": "Plan my trip",
  "home.flyIn": "Fly into Kandy",
};

const si: Record<string, string> = {
  "nav.explore": "ගවේෂණය",
  "nav.places": "ස්ථාන",
  "nav.planner": "සංචාරය සැලසුම් කරන්න",
  "nav.assistant": "AI සහායක",
  "nav.tours": "අතථ්‍ය චාරිකා",
  "nav.saved": "සුරැකි",
  "common.search": "සොයන්න",
  "common.planTrip": "මගේ සංචාරය සැලසුම් කරන්න",
  "common.exploreKandy": "මහනුවර ගවේෂණය කරන්න",
  "common.viewAll": "සියල්ල බලන්න",
};

const ta: Record<string, string> = {
  "nav.explore": "ஆராயுங்கள்",
  "nav.places": "இடங்கள்",
  "nav.planner": "பயணத்தைத் திட்டமிடு",
  "nav.assistant": "AI உதவியாளர்",
  "nav.tours": "மெய்நிகர் சுற்றுலாக்கள்",
  "nav.saved": "சேமித்தவை",
  "common.search": "தேடு",
  "common.planTrip": "எனது பயணத்தைத் திட்டமிடு",
  "common.exploreKandy": "கண்டியை ஆராயுங்கள்",
  "common.viewAll": "அனைத்தையும் பார்",
};

export const dictionaries: Record<Locale, Record<string, string>> = { en, si, ta };

export function translate(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
}

export function isFullyTranslated(locale: Locale): boolean {
  return locale === "en";
}
