# View Kandy security audit and risk register

**Last reviewed:** 25 November 2026  
**Scope:** the View Kandy Next.js application, route handlers, data layer, Supabase integration, Google/OpenStreetMap integrations, and deployment configuration in this repository.  
**Companion surface:** `/security` (public trust center) renders a filtered view of this register.

This document is deliberately explicit. It records the internet-sourced risk lists used for the review, the controls View Kandy has today, and the gaps that still need operational work. It is an engineering audit, not a certification or a guarantee that a deployment is secure.

---

## Status legend

| Status | Meaning |
| --- | --- |
| **Implemented** | A code-level control exists in this repository. |
| **Partial** | A control exists but has a known limitation (for example, single-process rate limiting). |
| **Deployment-dependent** | Correct behavior depends on platform configuration, DNS, RLS policies, key restrictions, or monitoring that cannot be proven from source alone. |
| **Open** | No adequate control is present yet; tracked as a follow-up. |
| **Not applicable** | The feature or trust boundary is not used by View Kandy. |

---

## Executive summary

View Kandy already avoids several high-frequency failure modes:

- No secret is knowingly exposed through `NEXT_PUBLIC_*`; server-only keys are read only in route handlers and scripts.
- All route handlers are treated as public HTTP surfaces; admin routes call `requireAdmin()` again inside the handler.
- Admin sessions use a signed, HttpOnly, SameSite cookie with HMAC-SHA256 and constant-time verification.
- Request payloads are validated with Zod; unknown keys are stripped rather than copied into database writes.
- Community report photos are written to a private Supabase bucket and exposed through short-lived signed URLs.
- External API responses are parsed into explicit local types rather than rendered as trusted HTML.
- Security headers, same-origin mutation checks, bounded JSON reads, API no-store responses and structured security events are included in this branch.

Remaining material limitations:

- The rate limiter is in-process; a multi-instance deployment needs a shared store such as Upstash Redis or Vercel KV.
- Admin authentication is password + signed cookie only; there is no MFA, SSO, or per-user role model.
- Security events are emitted to structured stdout; there is no alerting pipeline until the deployment configures one.
- Supabase RLS, key restrictions, and the private bucket must be verified in the actual project, not just in code.
- Live Google, OpenAI, and Supabase behavior cannot be verified without valid billed/deployed credentials.

---

## 1. OWASP Top 10:2025 — complete list

Source: [https://top10.owasp.org/2025/](https://top10.owasp.org/2025/)

| ID | Risk | View Kandy status | Evidence / remaining work |
| --- | --- | --- | --- |
| A01 | Broken access control | Partial / deployment-dependent | Server-side `requireAdmin()` protects admin handlers; destination/report object IDs are validated. Supabase-saved data depends on RLS policies in the deployed project. A signed admin cookie is not a per-user authorization system. |
| A02 | Security misconfiguration | Implemented / deployment-dependent | `poweredByHeader: false`, nosniff, frame, referrer, permissions, HSTS, CSP and API no-store headers are configured. Production still needs key restrictions, disabled debug endpoints and patch management. |
| A03 | Software supply chain failures | Partial | Lockfile is committed and dependencies are pinned through it. Add automated dependency review, `npm audit` in CI, signed releases and provenance before high-assurance deployment. |
| A04 | Cryptographic failures | Partial | HMAC-SHA256 sessions, timing-safe comparisons, HTTPS-only external calls and server-only keys. The admin cookie secret derives from the password unless explicitly pinned; production must set `ADMIN_SESSION_SECRET` and `ADMIN_PASSWORD_SHA256`. |
| A05 | Injection | Implemented / partial | Drizzle parameterizes SQL; Zod validates and strips untrusted object properties; user text is rendered as text and a safe markdown subset. Full CSP tightening remains a hardening task. |
| A06 | Insecure design | Partial | Public submissions are rate-limited, moderated, labeled as unverified, and expire in the UI. Abuse flows still need shared rate limiting and anomaly alerts. |
| A07 | Authentication failures | Partial | HttpOnly/Secure/SameSite cookie, expiry, constant-time credential checks and login throttling. No MFA/account lockout beyond rate limiting; Supabase auth depends on deployed project settings. |
| A08 | Software or data integrity failures | Partial | No client-trusted roles; external API responses are schema-checked. No webhook or auto-update pipeline exists. CI artifact signing is not configured. |
| A09 | Security logging and alerting failures | Partial | Structured security events include blocked origins, oversized bodies, bad credentials and rate-limit outcomes, with query strings/body contents/IP values excluded. No alert destination is configured in the repository. |
| A10 | Mishandling of exceptional conditions | Partial | Route handlers catch expected failures and return generic messages; security-sensitive details stay server-side. Add error monitoring and fuzz/property tests for external response parsers. |

---

## 2. OWASP API Security Top 10:2023 — complete list

Source: [https://api-security.owasp.org/editions/2023/en/0x11-t10/](https://api-security.owasp.org/editions/2023/en/0x11-t10/)

| ID | Risk | View Kandy status | Evidence / remaining work |
| --- | --- | --- | --- |
| API1 | Broken object-level authorization (BOLA/IDOR) | Partial / deployment-dependent | Report and place IDs are looked up through server-side services, and admin mutations require a valid admin session. Saved favorites/itineraries depend on Supabase RLS ownership policies in the deployed project. |
| API2 | Broken authentication | Partial | Admin cookie verification, expiry and timing-safe checks are implemented; login is throttled and logged. Add MFA and rotate production secrets. |
| API3 | Broken object property authorization / mass assignment | Implemented | Zod schemas define explicit write shapes and strip unknown fields; admin writes map only to allowlisted columns. Do not spread raw request bodies into future database writes. |
| API4 | Unrestricted resource consumption | Partial | JSON bodies are bounded, report images are capped at 5 MB with MIME sniffing, and route-specific rate limits exist. Limits are in-process and need a shared backend for serverless/multi-instance use. |
| API5 | Broken function-level authorization | Implemented for admin APIs | Every admin handler calls `requireAdmin()` independently of pages or middleware. Continue this pattern for every new admin route. |
| API6 | Unrestricted sensitive business flows | Partial | Reports require duplication checks, moderation state and confirmation limits. Add device/session reputation or CAPTCHA if public abuse appears. |
| API7 | Server-side request forgery (SSRF) | Partial | Fetch URLs are built from fixed server-side hosts (Google, Open-Meteo, Overpass, OpenAI); clients cannot supply an arbitrary fetch URL. `OVERPASS_ENDPOINT` is operator-controlled, so validate it at deployment. |
| API8 | Security misconfiguration | Implemented / deployment-dependent | Security headers, CORS restraint (no wildcard credentialed CORS), and no-store API responses are in place. Production must remove unused keys/routes and patch dependencies. |
| API9 | Improper inventory management | Partial | Route handlers are visible in `app/api`; there is no intentional legacy version route. Add automated route inventory and stale-endpoint review to release checks. |
| API10 | Unsafe consumption of third-party APIs | Partial / deployment-dependent | Google, Overpass, Open-Meteo and OpenAI responses are transformed into explicit local types with fallbacks. Add strict schema validation and timeouts for every new third-party call. |

---

## 3. Next.js / React application mistakes

Sources:

- [How to think about data security in Next.js](https://nextjs.org/docs/app/guides/data-security)
- [OWASP Next.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html)

| Mistake people make | View Kandy status | Control / action |
| --- | --- | --- |
| Assuming every `/api/*` route is private | Implemented | Route handlers are public HTTP endpoints. Admin handlers re-check the signed cookie inside the handler. |
| Assuming a page redirect protects a Server Action | Implemented | No authorization relies on page-level redirects; future actions must authorize themselves. |
| Relying on middleware/proxy as the only auth layer | Implemented | Middleware is not the authorization boundary; server handlers and `requireAdmin()` are. |
| Trusting `searchParams`, headers, form fields, or hidden IDs/roles | Implemented | Zod validates payloads; roles are never accepted from the browser; request headers are used only for rate-limit hashing. |
| Returning full database rows or config objects to the browser | Implemented | APIs return explicit DTOs such as `freshness`, `moderationStatus`, and masked place fields. |
| Putting secrets in `NEXT_PUBLIC_*` | Implemented | `NEXT_PUBLIC_*` is limited to intentionally public values (app URL, Supabase URL/anon key, browser map key, Cesium token). |
| Committing `.env.local` or logging credentials | Implemented | `.env.local` is ignored; security logs omit headers, bodies, query strings and credentials. |
| Not validating or throttling expensive actions | Partial | Schemas, body limits and route rate limits exist; use a distributed limiter in production. |
| Using CORS as authentication or copying a permissive CSP | Implemented / partial | CORS is not an auth mechanism. A baseline CSP blocks framing, plugins and base-tag injection; tighten script directives after CSP-report review. |
| Not patching the framework after advisories | Deployment-dependent | Keep Next.js and transitive packages updated; add automated advisory checks in CI. |

---

## 4. Supabase, database and storage mistakes

Sources:

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

| Mistake people make | View Kandy status | Control / action |
| --- | --- | --- |
| Exposed tables without RLS | Deployment-dependent | `drizzle/` migrations and deployment checklist require RLS on user-owned saved tables. Verify in the Supabase dashboard before launch. |
| Overly broad grants after adding RLS | Deployment-dependent | Revoke broad `anon`/`authenticated` privileges, then grant least privilege per table/function. |
| Policies such as `using (true)` or unscoped `to authenticated` | Deployment-dependent | Saved-data policies must compare `auth.uid()` to the row owner. Catalogue reads are intentionally public editorial data. |
| `using` without `with check` on writes | Deployment-dependent | Insert/update policies must both allow reading and constrain the owner id being written. |
| Exposing the service-role/secret key | Implemented | `SUPABASE_SERVICE_ROLE_KEY` is server-only and used only by server scripts/route handlers. Rotate if it ever appears in a log or client bundle. |
| Public user-upload buckets | Implemented | `report-images` is created with `public: false`; report photos are served through short-lived signed URLs. |
| Broad storage `SELECT` policies | Deployment-dependent | Storage policies must restrict listing/signing to owner/moderator roles; the app never calls `getPublicUrl()` for report photos. |
| Switching a bucket private while clients use public URLs | Implemented | `signReportImage()` is the only display path for report photos. |
| Treating file paths in rows as harmless | Implemented | `reportImagePathSchema` accepts only app-generated `reports/YYYY-MM-DD/<uuid>.<ext>` paths. |
| Not rotating leaked keys | Deployment-dependent | Document rotation in the deployment checklist; rotate immediately on suspected exposure. |

---

## 5. Google Maps and external API mistakes

Source: [Google Maps Platform API security best practices](https://developers.google.com/maps/api-security-best-practices)

| Mistake people make | View Kandy status | Control / action |
| --- | --- | --- |
| Unrestricted API keys | Deployment-dependent | Separate browser/server keys are documented. Restrict browser keys by HTTP referrer and server keys by API and IP. |
| One key shared across web, mobile and server | Implemented in configuration | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_SERVER_API_KEY` are separate variables. |
| Keys embedded in source or committed to GitHub | Implemented | Keys are read from environment variables; `.env.local` is ignored. |
| Unused keys, no usage monitoring, no quotas | Deployment-dependent | Delete unused keys, set budgets/alerts, and review the Google Cloud dashboard monthly. |
| Wrong key used on the wrong side | Implemented in configuration | Server Routes/Places calls use the server key; browser Photorealistic 3D Tiles use the browser key. |
| Trusting third-party responses | Partial | Responses are transformed into typed local objects; add strict runtime validation and timeouts for each new provider. |

---

## 6. Human and operational mistakes

| Mistake | View Kandy status | Control / action |
| --- | --- | --- |
| Password reuse, weak passwords, shared admin accounts | Partial | Password length is enforced at login and rate limited; production should use a long unique password plus MFA/SSO and named admin accounts. |
| Phishing/social engineering | Deployment-dependent | Never approve unexpected login prompts; verify requests through a second channel. |
| Over-sharing secrets in screenshots, tickets, chats or logs | Partial | Security events are redacted; keep `.env.local`, signed URLs and tokens out of issues and screenshots. |
| Public preview environments with production keys | Deployment-dependent | Use distinct preview keys/projects and never copy production secrets into preview deployments. |
| Access not revoked when people leave | Deployment-dependent | Rotate `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD*`, Supabase and cloud keys on team changes. |
| No backups or untested restores | Deployment-dependent | Schedule database backups and run a restore drill before launch. |
| No incident plan | Open | Define owner, containment steps, key rotation order and disclosure contact before public launch. |

---

## 7. Concrete controls in this codebase

### Transport and response headers

- `Strict-Transport-Security` on HTTPS deployments.
- Baseline `Content-Security-Policy` with `default-src 'self'`, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'self'`, and `form-action 'self'`.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: SAMEORIGIN`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` with camera/microphone disabled and geolocation limited to self.
- `Cache-Control: no-store` for `/api/*` responses.

### Request and mutation guards

- Same-origin `Origin` checks on mutating report, upload, login and moderation APIs. Requests without an `Origin` header (server-to-server clients) remain allowed; mismatches are blocked with 403.
- JSON bodies are streamed through a bounded reader (64 KB default) before parsing, so oversized requests fail before allocation.
- Multipart uploads check `Content-Length` early and the decoded file size later; the hard cap is 5 MB.
- MIME type is sniffed from file bytes and must match the declared image type.
- Zod schemas reject malformed payloads and strip unknown object properties.

### Authentication and authorization

- `requireAdmin()` is called inside each admin route handler.
- Admin tokens are HMAC-SHA256 signed, expire after eight hours, and are verified with constant-time comparison.
- The admin cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Failed logins, blocked origins, oversized bodies and rate-limit outcomes emit structured security events without credentials or raw client identifiers.

### Data and media

- External providers are allowlisted server-side; no client-controlled URL is fetched by the server.
- Place photos come from committed/local assets or explicitly configured public sources.
- Report photos are private objects with short-lived signed URLs.
- Community reports carry moderation status, freshness and explicit “not official” labeling.

---

## 8. Pre-deployment security checklist

1. Set `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD_SHA256`, `NEXT_PUBLIC_APP_URL`, and all provider keys from the secret manager; never commit them.
2. Restrict Google browser keys by HTTP referrer and server keys by API/IP; set billing alerts and delete unused keys.
3. Confirm Supabase RLS on every user-owned table, least-privilege grants, and private `report-images` storage policies.
4. Replace in-process rate limiting with a shared store if more than one instance serves traffic.
5. Configure a log sink and alerts for `security` events, repeated 401/403 responses, and 429 bursts.
6. Enable HTTPS-only deployment and verify HSTS/CSP headers with a browser security scanner.
7. Review CSP reports after real traffic and remove unnecessary `unsafe-*` directives.
8. Patch Next.js and dependencies regularly; run `npm audit`/dependency review in CI.
9. Back up the database and test restore.
10. Publish a vulnerability-reporting path through `/contact` and define an incident owner.

---

## 9. Verification performed

- `npm run typecheck`
- `npm run lint`
- Vitest unit and component suite
- `npm run build`
- Playwright browser/API smoke suite using the installed Chrome channel

Live Google Maps/Places/Routes, browser Supabase auth and OpenAI behavior are not fully verifiable without valid billed/deployed credentials. Their configuration and fallback paths are documented, and missing keys degrade to explicitly labeled local modes.

---

## 10. Sources

- OWASP Top 10:2025 — https://top10.owasp.org/2025/
- OWASP API Security Top 10:2023 — https://api-security.owasp.org/editions/2023/en/0x11-t10/
- Next.js data security guide — https://nextjs.org/docs/app/guides/data-security
- OWASP Next.js Security Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html
- Supabase RLS — https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control — https://supabase.com/docs/guides/storage/security/access-control
- Google Maps Platform API security best practices — https://developers.google.com/maps/api-security-best-practices

Report a suspected vulnerability through the [contact page](/contact). Include reproduction steps and impact; do not include live secrets in the report.
