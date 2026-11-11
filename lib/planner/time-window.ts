export interface TimeWindow {
  /** Minutes from midnight. */
  start: number;
  /** Minutes from midnight, may exceed 1440 for overnight windows. */
  end: number;
}

const TIME_RANGE =
  /(\d{1,2})[:.](\d{2})\s*(?:-|–|—|to)\s*(\d{1,2})[:.](\d{2})/gi;

/**
 * Parses simple opening-hours strings such as "06:00-20:00" or
 * "07:30–17:00, 18:00–21:00". Day names are ignored for the time windows.
 *
 * Returns `null` when no machine-readable time range exists — the caller must
 * treat that as "unknown", never as "open".
 */
export function parseOpeningHours(raw: string | null | undefined): TimeWindow[] | null {
  if (!raw) return null;
  if (/closed/i.test(raw) && !/\d{1,2}[:.]\d{2}/.test(raw)) return null;

  const windows: TimeWindow[] = [];
  TIME_RANGE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TIME_RANGE.exec(raw)) !== null) {
    const startH = Number(match[1]);
    const startM = Number(match[2]);
    const endH = Number(match[3]);
    const endM = Number(match[4]);
    if (startH > 23 || endH > 23 || startM > 59 || endM > 59) continue;
    let start = startH * 60 + startM;
    let end = endH * 60 + endM;
    if (end <= start) end += 1440;
    if (end - start < 5) continue;
    windows.push({ start, end });
  }
  return windows.length > 0 ? windows : null;
}

export function isOpenAt(
  windows: TimeWindow[] | null,
  minutesFromMidnight: number,
): "open" | "closed" | "unknown" {
  if (!windows) return "unknown";
  const minute = ((minutesFromMidnight % 1440) + 1440) % 1440;
  for (const window of windows) {
    if (minute >= window.start && minute <= window.end) return "open";
    // Handle windows that wrap past midnight.
    if (window.end > 1440 && minute + 1440 >= window.start && minute + 1440 <= window.end) {
      return "open";
    }
  }
  return "closed";
}

/** Latest minute you can still start a visit and finish before closing. */
export function latestStart(windows: TimeWindow[] | null): number | null {
  if (!windows) return null;
  return Math.max(...windows.map((w) => (w.end > 1440 ? w.end - 1440 : w.end)));
}
