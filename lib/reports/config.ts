export const REPORT_CATEGORIES = {
  crowd: { label: "Crowd conditions", issues: ["Very quiet", "Quiet", "Moderate", "Busy", "Extremely crowded"] },
  road_transport: { label: "Road and transport", issues: ["Traffic congestion", "Road closure", "Road construction", "Parking availability", "Tuk-tuk or transport difficulties", "Public transport disruption"] },
  destination_condition: { label: "Destination conditions", issues: ["Temporarily closed", "Unexpected opening-hour changes", "Entry restrictions", "Maintenance work", "Poor cleanliness", "Facilities unavailable", "Accessibility problems"] },
  weather_environment: { label: "Weather and environment", issues: ["Heavy rain", "Flooding", "Strong winds", "Poor visibility", "Slippery walking paths", "Other environmental conditions"] },
  pricing_experience: { label: "Pricing and visitor experiences", issues: ["Unexpected entrance fees", "Price changes", "Unexpected additional charges", "Overcharging concerns", "Misleading offers", "Other relevant visitor experiences"] },
  general_update: { label: "General visitor updates", issues: ["Beautiful current viewpoint conditions", "Special event", "Local activity", "Useful visitor information", "Other relevant observation"] },
} as const;

export type ReportCategoryKey = keyof typeof REPORT_CATEGORIES;

export function freshnessMinutes(category: ReportCategoryKey): number {
  switch (category) {
    case "crowd":
    case "road_transport":
      return 60;
    case "weather_environment":
      return 90;
    case "destination_condition":
      return 24 * 60; // remains active until reviewed/resolved in many cases; expiry used as staleness hint
    case "pricing_experience":
      return 7 * 24 * 60; // historical but should be reviewed before presented as current
    case "general_update":
      return 180;
    default:
      return 120;
  }
}

export function freshnessLabel(createdAt: string, expiresAt: string | null, status: string, moderationStatus: string): "recent" | "confirming" | "potentially_outdated" | "verified" | "resolved" | "rejected" {
  if (status === "rejected" || moderationStatus === "rejected") return "rejected";
  if (status === "resolved") return "resolved";
  const now = Date.now();
  if (status === "expired" || (expiresAt && new Date(expiresAt).getTime() < now)) return "potentially_outdated";
  if (moderationStatus === "approved") return "verified";
  const ageMin = (now - new Date(createdAt).getTime()) / 60000;
  if (ageMin <= 45) return "recent";
  return "confirming";
}
