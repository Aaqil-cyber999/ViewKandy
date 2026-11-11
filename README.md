# KandyVerse

**Explore Kandy beyond the map.**

KandyVerse is an immersive 3D digital-tourism and smart-city platform for Kandy, Sri Lanka. It combines a real-coordinate 3D explorer, an editorial place database, a realistic itinerary planner, a grounded AI guide and a mobile-first PWA.

The project is built around one rule: **never invent a fact to make the screen look fuller.** Coordinates, places and tour routes are real. Opening hours, entry fees, phone numbers, ratings, reviews and photographs are only shown when an editor has recorded a source. Everything else is labelled as unknown.

---

## What is actually real

| Data | Status in this repository |
| --- | --- |
| Places | 34 real Kandy locations with real coordinates, editorial summaries and categories |
| Categories | 12 editorial categories (heritage, religious, nature, viewpoint, museum, experience, food, hotel, shopping, transport, health, services) |
| Virtual tours | 5 camera tours over real coordinates |
| Opening hours / entry fees / phones | `null` for every seeded place until an editor records a source |
| Ratings / reviews | Not collected and never generated |
| Photographs | No stock photos. Generative category artwork is used and explicitly labelled as not a photograph |
| Verification | Every seeded place is `unverified`; the admin console requires a source URL **and** a verification date before it can be marked verified |
| 3D | Real Cesium globe + real coordinates + illustrative landmark massing. Google Photorealistic 3D Tiles are used only when a browser key is configured |
| Routing | Geometric walking/driving estimates by default; live Google Routes geometry only when a server key is configured |
| Weather | Live Open-Meteo data, or an explicit unavailable state. No cached or invented values |
| Google Places | Optional live nearby enrichment. Shown only when `GOOGLE_MAPS_SERVER_API_KEY` is configured; always labelled external and never treated as editorial verification |
| OpenStreetMap services | Optional live Overpass query for ATMs, pharmacies, toilets and similar services. Attributed to © OpenStreetMap contributors (ODbL) |
| Street View | Official Google Maps Street View deep links. No embedded image and no billed key exposed in the browser |
| AI | OpenAI with read-only database tools when configured; otherwise a deterministic grounded retrieval/planner engine that says it is in grounded mode |

The seed data is validated at module load and again by tests. If a field would be invented, the build fails the honesty tests.

---

## Feature tour

| Route | What it does |
| --- | --- |
| `/` | Cinematic 3D hero, category browse, featured places, planner and assistant entry points |
| `/explore` | Search, filter, 3D Cesium scene, 2D Leaflet fallback, place selection, route estimate and deep links |
| `/places` | Full editorial catalogue with search, category filters and honest data badges |
| `/places/[slug]` | Place detail: coordinates, verification state, practical facts, editorial nearby places, map, route panel, Street View link, optional live Google Places and OpenStreetMap services, save/shortlist/share |
| `/planner` | Time-boxed itinerary generation with interests, pace, budget, meals, accessibility, pinned places, reordering, ICS/Markdown export |
| `/assistant` | Grounded chat with place cards, itineraries, sources and tool traces; deterministic fallback without a key |
| `/tours` | Five virtual tours with a Cesium tour player and per-stop navigation |
| `/saved` | Local-first favourites, pinned places and saved itineraries; optional Supabase account sync |
| `/auth` | Supabase Auth sign-in/sign-up when configured; local mode otherwise |
| `/admin` | HMAC-cookie protected editorial console: stats, search, create/edit/delete, verification guard, audit log |
| `/offline` | PWA offline fallback page |
| `/api/*` | Catalogue, weather, routes, live nearby places/services, assistant, admin and account-save APIs |

Mobile navigation, a skip link, keyboard focus styles, reduced-motion CSS, dark theme, English/Sinhala/Tamil UI strings, PWA install metadata, sitemap, robots and Open Graph image are included.

---

## Stack

- **Framework:** Next.js 15.5 (App Router), React 19.1, TypeScript 5.9
- **Styling/UI:** Tailwind CSS 4, shadcn-style primitives, Lucide icons, Framer Motion, custom design tokens
- **State/forms:** Zustand (persisted local saves), React Hook Form, Zod 4
- **3D/maps:** CesiumJS 1.132 (local prebuilt runtime), Google Photorealistic 3D Tiles (optional), Leaflet + marker clustering (2D fallback), Turf distance/bearing
- **Live enrichment:** Google Places API (New) and OpenStreetMap Overpass (optional, server-side, attributed)
- **Database:** PostgreSQL + PostGIS through **Drizzle ORM** (`drizzle-orm` + `node-postgres`)
- **Auth/storage:** Supabase Auth/Storage (optional); signed HttpOnly cookie for the editorial admin
- **AI:** OpenAI Responses API via `fetch` with a whitelisted tool layer; deterministic grounded fallback
- **Weather:** Open-Meteo (no key)
- **Tests:** Vitest + Testing Library + jsdom; Playwright for browser/API smoke tests

---

## Architecture

```
Browser
  ├─ Next.js App Router pages (server components)
  │    ├─ catalogue reads ───────────────┐
  │    ├─ planner (client, deterministic)│
  │    ├─ Cesium / Leaflet maps          │
  │    └─ Zustand local saves            │
  │                                      ▼
  ├─ Route Handlers ───────────────► lib/db facade
  │    ├─ /api/places                 ├─ DATABASE_URL set → Drizzle + Postgres/PostGIS
  │    ├─ /api/weather                └─ otherwise/unreachable → bundled seed + .data overrides
  │    ├─ /api/routes ──────────────► Google Routes API (optional) or estimate
  │    ├─ /api/nearby ──────────────► Google Places API (New), optional + attributed
  │    ├─ /api/osm-services ────────► Overpass API, attributed ODbL
  │    ├─ /api/assistant ───────────► OpenAI tools or deterministic grounded engine
  │    ├─ /api/admin/* ─────────────► HMAC cookie → Drizzle/Postgres or local overrides
  │    └─ /api/saved/* ─────────────► Supabase Auth + RLS-protected tables
  │
  └─ Optional external services
       ├─ Google Photorealistic 3D Tiles (browser key)
       ├─ Google Routes + Places APIs (server key)
       ├─ OpenStreetMap Overpass (no key, public endpoint)
       ├─ Open-Meteo (no key)
       └─ Supabase Auth/Storage (anon key + project URL)
```

### Data flow and fallbacks

1. **Postgres is authoritative when `DATABASE_URL` is set.** Reads go through `lib/db/drizzle-store.ts`.
2. **If Postgres is unreachable, reads degrade to the bundled seed** and log the failure. The UI keeps working; admin writes fall back to `.data/overrides.json` when no database is configured.
3. **The AI never receives SQL or a database connection.** It can call nine validated, read-only tools: search places, place details, nearby places, route estimate, itinerary generation, budget estimate, weather, opening hours and nearby services.
4. **Missing facts stay missing.** Tool results and UI components distinguish `unknown`, `estimate`, `live route`, `verified` and `unverified`.
5. **External live data is isolated.** Google Places and Overpass results are rendered only in their own labelled panels, with source attribution and links back to Google/OSM. They never overwrite or validate the editorial catalogue.

---

## Quick start

Requirements: Node.js ≥ 20.9, npm 11+.

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The app runs with **no keys at all** using the bundled seed data.

`predev` and `prebuild` run `npm run setup:assets`, which copies the prebuilt Cesium runtime into `public/cesium` and Leaflet CSS into `public/vendor`. These generated directories are gitignored and recreated automatically.

Useful commands:

```bash
npm run typecheck        # tsc --noEmit
npm run test             # Vitest unit + component tests
npm run test:e2e         # Playwright (starts a dev server on port 3100)
npm run build            # production build
npm run start            # serve the production build
npm run check            # typecheck + unit/component tests
npm run icons            # regenerate PWA PNG icons (dependency-free)
npm run db:check         # read-only database diagnostics
```

---

## Environment variables

Copy `.env.example` to `.env.local`. Secrets are server-only unless prefixed with `NEXT_PUBLIC_`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical URL for metadata, sitemap, Open Graph and auth redirects |
| `DATABASE_URL` | Optional | PostgreSQL/PostGIS connection string (Supabase pooler or any Postgres). Server-only |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL for Auth/Storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anon key (safe for the browser) |
| `ADMIN_EMAIL` | Admin only | Editorial admin login email |
| `ADMIN_PASSWORD` | Admin only | Plain password for local development |
| `ADMIN_PASSWORD_SHA256` | Admin only | SHA-256 hex digest for production (`printf '%s' 'pw' \| sha256sum`) |
| `ADMIN_SESSION_SECRET` | Optional | Pins the HMAC session secret. Defaults to a hash of the password |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Browser key for Google Photorealistic 3D Tiles. Restrict by HTTP referrer |
| `GOOGLE_MAPS_SERVER_API_KEY` | Optional | Server key for the Google Routes **and Places (New)** APIs. Restrict by API/IP. Never expose it |
| `OVERPASS_ENDPOINT` | Optional | Overrides the default `https://overpass-api.de/api/interpreter` endpoint |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Optional | Enables Cesium World Terrain and terrain sampling |
| `OPENAI_API_KEY` | Optional | Enables the conversational AI assistant |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-4.1-mini` |

Live Google Places is enabled only when `GOOGLE_MAPS_SERVER_API_KEY` is set. Overpass works without a key but depends on the public endpoint being reachable; both integrations fail closed with an explicit warning.

### Admin login

Set `ADMIN_EMAIL` plus either `ADMIN_PASSWORD` (local) or `ADMIN_PASSWORD_SHA256` (production). Then open `/admin`. The session is an HMAC-signed, HttpOnly, SameSite=Lax cookie with an 8-hour lifetime; it is marked `Secure` in production.

There is no fake role system. The admin console is a single editorial role, and verification changes are written to `verification_logs` when Postgres is active.

---

## Database setup (Drizzle + PostGIS)

Drizzle is the source of truth for the schema. Supabase provides Postgres, Auth and Storage; the catalogue is read and written server-side through Drizzle.

```bash
# 1. Configure
cp .env.example .env.local
# Set DATABASE_URL to the Supabase session pooler (port 5432) or a direct URL

# 2. Create extensions, schema, seed
npm run db:setup        # bootstrap + migrate + seed

# 3. Verify
npm run db:check
```

What each step does:

- `db:bootstrap` — idempotently creates the `extensions` schema, enables PostGIS, puts `extensions` on the connection role's `search_path` (needed by the generated `geography` column), and prepares the storage bucket.
- `db:migrate` — applies `drizzle/0000_open_hiroim.sql` (six tables, checks, indexes, RLS policies, GIST index and the generated PostGIS `location` column) through Drizzle's programmatic migrator. `db:generate` still uses `drizzle-kit`.
- `db:seed` — upserts `data/seed/*.json` through Drizzle. Seeding is safe to re-run.

Schema changes:

```bash
# edit lib/db/schema.ts
npm run db:generate     # writes a new SQL migration to drizzle/
npm run db:migrate
```

Tables:

| Table | Purpose |
| --- | --- |
| `categories` | 12 public editorial categories |
| `places` | Catalogue with coordinates, verification fields, generated `geography(Point,4326)` location, checks and GIST index |
| `place_images` | Credited/licensed photography; empty in the seed |
| `verification_logs` | Audit trail for verification changes |
| `favorites` | Per-user saved places, RLS-protected |
| `itineraries` | Per-user saved plans (JSONB), RLS-protected |

RLS is enabled on every table. Public catalogue tables allow `SELECT`; per-user tables restrict reads/writes to `auth.uid() = user_id`. `supabase/auth-fk.sql` optionally adds database-level FKs to `auth.users`.

See [`supabase/README.md`](supabase/README.md) for the full database workflow and troubleshooting notes.

---

## 3D and mapping behaviour

- **Default scene:** CARTO dark OSM imagery on a Cesium ellipsoid, real coordinates, procedural landmark massing. The massing is labelled illustrative, never photorealistic.
- **Google Photorealistic 3D Tiles:** attempted only when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is present. If tiles are unavailable for Kandy or the key is invalid, the scene falls back to the globe and custom landmarks and logs the reason.
- **Cesium ion terrain:** optional; without a token the scene stays on the ellipsoid.
- **2D fallback:** Leaflet + CARTO dark tiles + marker clustering, used when WebGL is unavailable or the user switches views.
- **Routing:** the planner and route panel use a documented geometric model (straight-line distance × street-detour factor ÷ conservative city speed + overhead). Live Google Routes geometry is requested only on demand when `GOOGLE_MAPS_SERVER_API_KEY` is set. The UI labels each result `estimate` or `live route`.
- **Deep links:** every place can open in Google Maps directions and Street View; no key is required.
- **Live Google Places:** when `GOOGLE_MAPS_SERVER_API_KEY` is set, the place page can query Google Places API (New) for nearby services. Results are sorted by distance, attributed to Google and labelled external.
- **Live OpenStreetMap services:** the place page can query Overpass for ATMs, banks, pharmacies, hospitals, toilets, drinking water, fuel, supermarkets, convenience stores and tourist information. Results link to their OSM node and carry ODbL attribution.
- **Caching:** Google Places results are cached in memory for 5 minutes; Overpass results for 10 minutes. Both fail closed with an explicit warning instead of showing invented data.

The Cesium runtime is served locally from `/cesium/Cesium.js`; no CDN is required at runtime. `next.config.ts` adds immutable caching for that path.

---

## AI assistant

`/assistant` posts to `/api/assistant` with a Zod-validated message, optional history and optional coordinates.

- **With `OPENAI_API_KEY`:** the OpenAI Responses API runs a bounded tool loop against nine whitelisted, read-only tools. The model never sees SQL.
- **Without a key (or on model failure):** `lib/ai/grounded.ts` answers deterministically from the catalogue and planner. The response includes a notice explaining grounded mode.
- **Rate limits:** 20 assistant requests/minute, 30 route requests/minute, 20 nearby-places requests/minute and 10 Overpass requests/minute per client key. In-memory; use a shared store in a multi-instance deployment.
- **No hallucinated facts:** tool outputs distinguish unknown hours/fees from known ones, and the system prompt instructs the model to say when data is missing.

The assistant can search places, fetch details, find nearby places/services, estimate routes, build a time-boxed itinerary, estimate a budget, read live weather and report opening hours.

---

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/places` | Search/filter catalogue (`q`, `category`, `lat`, `lng`, `radius`, `limit`) |
| `GET` | `/api/places/[slug]` | Place detail + nearby places |
| `GET` | `/api/weather` | Live Open-Meteo snapshot; `503` with an explicit message when unavailable |
| `POST` | `/api/routes` | Google Routes geometry when configured, otherwise a labelled estimate |
| `GET` | `/api/nearby` | Live Google Places nearby results; `503` with a warning when not configured/unavailable |
| `GET` | `/api/osm-services` | Live OpenStreetMap services via Overpass; `503` with a warning when unavailable |
| `POST` | `/api/assistant` | Grounded assistant answer, place cards, optional itinerary, sources |
| `POST` | `/api/admin/login` | Admin login; sets the signed HttpOnly cookie |
| `POST` | `/api/admin/logout` | Clears the admin cookie |
| `GET` | `/api/admin/session` | Current admin session state |
| `GET`/`POST` | `/api/admin/places` | List/create places (admin only) |
| `PATCH`/`DELETE` | `/api/admin/places/[id]` | Update/delete a place (admin only) |
| `GET`/`POST`/`DELETE` | `/api/saved/favorites` | Account favourites (Supabase Auth + RLS) |
| `GET`/`POST`/`DELETE` | `/api/saved/itineraries` | Account itineraries (Supabase Auth + RLS) |

All request bodies are validated with Zod. Admin routes return `401` without a valid session. Account routes return `503` when Supabase is not configured and `401` when signed out.

---

## Testing

```bash
npm run test          # Vitest: unit + component
npm run test:e2e      # Playwright: browser + API smoke tests
```

The Playwright suite starts its own dev server on port **3100** (override with `PLAYWRIGHT_PORT`). Install the browser once:

```bash
npx playwright install chromium
```

If the Playwright browser download is blocked, reuse an installed Chrome or Edge instead:

```bash
# macOS/Linux
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e

# Windows PowerShell
$env:PLAYWRIGHT_CHANNEL="chrome"; npm run test:e2e
```

Coverage includes:

- **Unit:** distance/bearing/formatting, opening-hours parsing, budget estimates, route optimiser, itinerary generator, ICS/Markdown export, search ranking/filters, Zod validation, admin HMAC auth, weather codes/advice, seed-data honesty, Google Places normalisation/fallback, Overpass parsing/fallback and Street View URL generation.
- **Component:** save/shortlist buttons with Zustand + toasts, safe Markdown renderer (no raw HTML), verification badges.
- **E2E:** every public page, a place detail, the branded 404, grounded assistant answer, catalogue/filter/detail APIs, assistant API, manifest/robots/sitemap, security headers and a mobile viewport/navigation flow.

Local verification (2026-11-12):

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run test` | **168 tests in 16 files — pass** |
| `npm run build` | Pass — 32 routes generated |
| `npm run test:e2e` | **21 tests in 2 projects — pass** (desktop + mobile, system Chrome via `PLAYWRIGHT_CHANNEL=chrome`) |
| `npm run db:setup` / `db:check` | Pass — Supabase Postgres 17.11, PostGIS 3.3.7, 12 categories and 34 places seeded |

The seed-honesty test fails the suite if anyone adds invented hours, fees, phones, ratings, photos or verification state to `data/seed/places.json`.

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub/GitLab and import it into Vercel.
2. Set the environment variables from the table above in **Project → Settings → Environment Variables**. Keep `DATABASE_URL`, `GOOGLE_MAPS_SERVER_API_KEY`, `OPENAI_API_KEY`, `ADMIN_*` server-only.
3. Set `NEXT_PUBLIC_APP_URL` to the production URL (for example `https://kandyverse.example`).
4. Provision Supabase Postgres/PostGIS and run the database setup **once against the production database** from your machine or CI:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:setup
   DATABASE_URL="postgresql://..." npm run db:check
   ```
5. Deploy. Vercel runs `npm run build`; the `prebuild` hook copies Cesium/Leaflet assets into `public/`.
6. In Supabase Auth, add the production URL to the allowed redirect URLs (`/auth/callback`).
7. Restrict the Google browser key by HTTP referrer and the server key by API/IP. Restrict the OpenAI key by project and spend limits.

### Any Node host

```bash
npm ci
npm run build
npm run start        # PORT=3000 by default
```

Use a persistent Node runtime (not Edge) for the route handlers and `node-postgres`. Put the app behind TLS. The service worker only caches same-origin GETs and never caches `/api/`, `/admin`, `/auth` or `/cesium/`.

### Operational notes

- Run migrations as a release step, not on every request.
- The in-memory rate limiter is per instance. Use Redis/Upstash for horizontal scaling.
- `db:bootstrap` is idempotent and safe to re-run.
- Rotate any database password that has been shared in plaintext, then update `DATABASE_URL`.

---

## Security

- Secrets live only in environment variables; `.env.local` is gitignored.
- Admin sessions use HMAC-SHA256 signatures, constant-time comparison, an expiry claim and an HttpOnly/SameSite cookie.
- Every API body is Zod-validated; catalogue writes require an admin session.
- Postgres RLS protects per-user favourites and itineraries; the public catalogue is read-only to anonymous users.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- The assistant has no SQL access, only whitelisted read-only tools.
- The service worker excludes private/API paths from caching.
- `npm run build` fails on TypeScript errors; the unit suite guards data honesty.

---

## Performance, PWA, SEO and i18n

- **PWA:** web manifest, install shortcuts, generated PNG/maskable/apple icons, service worker with network-first navigations, cache-first static assets and an offline page. API responses are never cached.
- **Performance:** server components for catalogue reads, dynamic Cesium import, Leaflet fallback, long-cache headers for `/cesium/*`, image-friendly Next config, no stock photography payloads.
- **SEO:** metadata templates, canonical place URLs, JSON-LD (`WebSite`, `TouristAttraction`), `robots.txt`, dynamic sitemap, Open Graph image route.
- **i18n:** English, Sinhala and Tamil UI dictionaries with a persisted language switcher. Editorial content remains in English.
- **Accessibility:** skip link, semantic headings, focus-visible styles, labelled icon buttons, `aria-pressed` toggles, reduced-motion support and text alternatives for decorative artwork.

---

## Project structure

```
app/                      App Router pages, API handlers, metadata routes
components/               UI, maps, planner, assistant, admin, layout, providers
data/seed/                Validated categories, places and tours JSON
drizzle/                  Generated SQL migration + metadata
lib/
  ai/                     OpenAI Responses loop, tools, deterministic fallback
  auth/                   Admin HMAC session, Supabase server/browser clients
  config/                 Site config
  data/                   Seed loading + Zod schemas
  db/                     Drizzle schema/client/store, search, local fallback
  geo/                    Distance, bearing, formatting, Kandy bounds
  i18n/                   EN/SI/TA dictionaries and provider
  maps/                   Cesium loader, Google Routes/Places, Overpass, Street View, landmark data
  planner/                Optimiser, schedule, budget, export, types
  store/                  Zustand persisted saves
  validation/             Shared Zod request schemas
  weather/                Open-Meteo client and WMO code mapping
public/                   Manifest, service worker, icons, generated assets
scripts/                  Asset setup, icon generation, DB bootstrap/check/seed
supabase/                 Database docs, optional auth FK, SQL seed
tests/                    unit, components, fixtures, e2e
types/                    Shared TypeScript types
```

---

## Limitations (honest list)

- **Live Google Places and Overpass paths were not exercised with real credentials/network during development.** The adapters, API routes, UI and unit tests are implemented with explicit fallbacks, but a deployment must validate them with restricted keys and a reachable Overpass endpoint. Google Places requires billing to be enabled.
- **Street View is a deep link, not an embedded panorama.** This avoids exposing a billed key in the browser and avoids showing a panorama that may not exist for a coordinate.
- **Google Photorealistic 3D Tiles coverage for Kandy is unverified.** The fallback globe + procedural massing is the primary experience and is labelled illustrative.
- **No live Google, OpenAI or Supabase Auth keys were available during development.** Google Routes, Google Places, OpenAI and Supabase Auth paths are implemented with fallbacks but their live responses were not exercised in this environment. The Postgres/PostGIS database has been provisioned and seeded.
- **Admin auth is a single editorial role**, not a multi-user RBAC system. Do not expose `/admin` as a public account system.
- **Account saves require Supabase Auth + RLS.** Local favourites, pins and itineraries work without an account.
- **The planner is a deterministic estimate**, not live traffic. It uses straight-line distance, a detour factor and conservative speeds; it does not know road closures, events or queues.
- **Editorial content is English-only.** UI chrome is translated to Sinhala and Tamil; place descriptions and verification notes are not.
- **In-memory rate limiting** resets on restart and is per instance.
- **No stock photos** are shipped. Real, credited photography must be added by an editor with a licence and attribution.

---

## Next phase

1. **Validate live integrations** with restricted Google Places/Routes keys and a production Overpass endpoint; add contract tests for upstream error shapes.
2. **Real editorial media:** credited, licensed photography through Supabase Storage with alt text and licence metadata.
3. **Multi-user editorial RBAC** with invite-only accounts, per-action audit trails and review queues.
4. **Offline itinerary packs:** cache a selected plan and its place records for genuine offline use.
5. **Observability:** structured request logs, error tracking, rate-limit metrics and uptime checks for weather/routes/Overpass.
6. **Performance budget:** Cesium bundle splitting, WebGL capability tiers and Lighthouse CI on mobile.

---

## Credits and licences

- Map imagery and live services: © OpenStreetMap contributors, ODbL; CARTO basemaps.
- 3D runtime: CesiumJS (Apache-2.0). Google Photorealistic 3D Tiles are subject to Google Maps Platform terms when enabled.
- Weather: Open-Meteo (CC BY 4.0).
- Routing: Google Routes API when configured; otherwise a documented geometric estimate.
- Places: Google Places API (New) when configured; results are attributed to Google and are not editorial verification.
- Icons: Lucide (ISC).
- Place coordinates and editorial summaries are part of this repository's seed dataset. Verify every practical fact against an official source before travel.
