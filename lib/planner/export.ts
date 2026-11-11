import type { Itinerary } from "./types";
import { formatMinutesAsTime, parseTimeToMinutes } from "@/lib/geo/distance";

/** Builds a standards-compliant .ics calendar for the itinerary. */
export function itineraryToIcs(itinerary: Itinerary, date = new Date()): string {
  const startMinutes = parseTimeToMinutes(itinerary.startTime) ?? 9 * 60;
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);

  const stamp = (minutes: number) => {
    const value = new Date(base);
    value.setMinutes(startMinutes + minutes);
    return `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, "0")}${String(
      value.getDate(),
    ).padStart(2, "0")}T${String(value.getHours()).padStart(2, "0")}${String(
      value.getMinutes(),
    ).padStart(2, "0")}00`;
  };

  const escape = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KandyVerse//Trip Planner//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escape(`KandyVerse · ${itinerary.startTime} plan`)}`,
  ];

  itinerary.stops.forEach((stop, index) => {
    const startOffset = stop.arrivalMinutes - startMinutes;
    const endOffset = stop.departureMinutes - startMinutes;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${itinerary.id}-${index}@kandyverse.local`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${stamp(startOffset)}`,
      `DTEND:${stamp(endOffset)}`,
      `SUMMARY:${escape(stop.place.name)}`,
      `LOCATION:${escape(stop.place.address ?? "Kandy, Sri Lanka")} (${stop.place.lat.toFixed(5)}, ${stop.place.lng.toFixed(5)})`,
      `DESCRIPTION:${escape(
        `${stop.place.summary}\nEstimated arrival ${formatMinutesAsTime(stop.arrivalMinutes)}. Travel: ${stop.travel.minutes} min (${stop.travel.source === "routes_api" ? "live route" : "estimate"}).`,
      )}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadItineraryIcs(itinerary: Itinerary): void {
  const blob = new Blob([itineraryToIcs(itinerary)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kandyverse-${itinerary.startTime.replace(":", "")}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function itineraryToMarkdown(itinerary: Itinerary): string {
  const lines = [
    `# KandyVerse plan · ${itinerary.startTime}–${itinerary.endTime}`,
    "",
    `Starting at **${itinerary.start.label}**. Mode: ${itinerary.mode}.`,
    "",
  ];
  itinerary.stops.forEach((stop, index) => {
    lines.push(
      `${index + 1}. **${formatMinutesAsTime(stop.arrivalMinutes)}–${formatMinutesAsTime(
        stop.departureMinutes,
      )}** · ${stop.place.name} (${stop.travel.minutes} min travel, ${stop.travel.source === "routes_api" ? "live route" : "estimate"})`,
    );
    lines.push(`   ${stop.place.summary}`);
  });
  lines.push("", `_Totals: ${itinerary.totals.totalMinutes} min · ${itinerary.totals.travelMinutes} min travelling · LKR ${itinerary.totals.estimatedTotalLkr.toLocaleString("en-LK")} estimated._`);
  lines.push("", "_Times and travel are estimates. Verify opening hours before travelling._");
  return lines.join("\n");
}
