import type { NextRequest } from "next/server";
import { fetchGoogleRoute } from "@/lib/maps/routes";
import { routeRequestSchema } from "@/lib/validation/schemas";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(clientKey(request, "routes"), 30, 60_000);
  if (!limited.allowed) return tooManyRequests(limited);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = routeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid route request.", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const { origin, destination, mode, waypoints } = parsed.data;
  const route = await fetchGoogleRoute(origin, destination, mode, waypoints ?? []);
  return Response.json(route, { headers: { "Cache-Control": "no-store" } });
}
