export const siteConfig = {
  name: "KandyVerse",
  tagline: "Explore Kandy Beyond the Map",
  description:
    "An immersive 3D tourism and smart-city exploration platform for Kandy, Sri Lanka. Discover verified places, plan a realistic itinerary, and navigate the city.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  locale: "en_LK",
  nav: [
    { href: "/explore", key: "nav.explore" },
    { href: "/places", key: "nav.places" },
    { href: "/planner", key: "nav.planner" },
    { href: "/assistant", key: "nav.assistant" },
    { href: "/tours", key: "nav.tours" },
  ],
  footer: {
    data: [
      { label: "OpenStreetMap", href: "https://www.openstreetmap.org/copyright" },
      { label: "Open-Meteo", href: "https://open-meteo.com/" },
      { label: "Google Maps Platform", href: "https://developers.google.com/maps" },
      { label: "CesiumJS", href: "https://cesium.com/platform/cesiumjs/" },
    ],
  },
} as const;
