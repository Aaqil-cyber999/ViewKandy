import { promises as fs } from "node:fs";
import path from "node:path";
import type { Place } from "@/types/place";
import { seedPlaces } from "@/lib/data";

const DATA_DIR = path.join(process.cwd(), ".data");
const OVERRIDES_FILE = path.join(DATA_DIR, "overrides.json");

interface OverridesFile {
  version: 1;
  updatedAt: string;
  places: Record<string, Place>;
  deletedIds: string[];
}

const EMPTY: OverridesFile = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  places: {},
  deletedIds: [],
};

async function readOverrides(): Promise<OverridesFile> {
  try {
    const raw = await fs.readFile(OVERRIDES_FILE, "utf8");
    const parsed = JSON.parse(raw) as OverridesFile;
    if (parsed.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? EMPTY.updatedAt,
      places: parsed.places ?? {},
      deletedIds: parsed.deletedIds ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

async function writeOverrides(data: OverridesFile): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${OVERRIDES_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, OVERRIDES_FILE);
}

export async function listLocalPlaces(): Promise<Place[]> {
  const overrides = await readOverrides();
  const deleted = new Set(overrides.deletedIds);
  const merged = new Map<string, Place>();
  for (const place of seedPlaces) {
    if (!deleted.has(place.id)) merged.set(place.id, place);
  }
  for (const [id, place] of Object.entries(overrides.places)) {
    if (!deleted.has(id)) merged.set(id, place);
  }
  return [...merged.values()];
}

export async function upsertLocalPlace(place: Place): Promise<Place> {
  const overrides = await readOverrides();
  overrides.places[place.id] = place;
  overrides.deletedIds = overrides.deletedIds.filter((id) => id !== place.id);
  overrides.updatedAt = new Date().toISOString();
  await writeOverrides(overrides);
  return place;
}

export async function deleteLocalPlace(id: string): Promise<boolean> {
  const overrides = await readOverrides();
  const exists =
    seedPlaces.some((p) => p.id === id) || Boolean(overrides.places[id]);
  if (!exists) return false;
  delete overrides.places[id];
  if (!overrides.deletedIds.includes(id)) overrides.deletedIds.push(id);
  overrides.updatedAt = new Date().toISOString();
  await writeOverrides(overrides);
  return true;
}

export async function localOverridesUpdatedAt(): Promise<string | null> {
  const overrides = await readOverrides();
  return overrides.updatedAt === EMPTY.updatedAt ? null : overrides.updatedAt;
}
