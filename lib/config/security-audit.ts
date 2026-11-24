export type AuditStatus = "implemented" | "partial" | "deployment" | "open";

export interface AuditRisk {
  id: string;
  title: string;
  status: AuditStatus;
  summary: string;
  controls: string[];
  gaps: string[];
}

export interface AuditCheck {
  label: string;
  status: AuditStatus;
  detail: string;
}

export interface AuditCheckGroup {
  id: string;
  title: string;
  description: string;
  checks: AuditCheck[];
}

export const AUDIT_DATE = "25 November 2026";

export const STATUS_LABELS: Record<AuditStatus, string> = {
  implemented: "Implemented",
  partial: "Partial",
  deployment: "Deploy-dependent",
  open: "Open",
};

export const TRUST_METRICS = [
  { value: "20", label: "OWASP risk categories reviewed" },
  { value: "64 KB", label: "Default JSON request ceiling" },
  { value: "5 MB", label: "Report photo upload cap" },
  { value: "60 min", label: "Report photo signed-URL lifetime" },
];

export const POSTURE_CARDS = [
  {
    title: "Server-only secrets",
    copy: "Service-role, database, map-server and admin credentials are read only on the server. Public variables are limited to intentionally public values.",
    status: "implemented" as const,
  },
  {
    title: "Private report media",
    copy: "Visitor photos go to a private bucket, are sniffed against their declared MIME type, and are displayed through expiring signed URLs.",
    status: "implemented" as const,
  },
  {
    title: "Guarded mutations",
    copy: "Mutating APIs check request origin, cap request bodies, validate shapes with Zod, and require the admin cookie where appropriate.",
    status: "implemented" as const,
  },
  {
    title: "Observable security",
    copy: "Blocked origins, oversized bodies, failed logins and rate-limit outcomes emit structured events without credentials or raw client identifiers.",
    status: "partial" as const,
  },
];

export const WEB_RISKS: AuditRisk[] = [
  {
    id: "A01",
    title: "Broken access control",
    status: "partial",
    summary: "Users reaching another user's data or an admin function without authorization.",
    controls: ["Admin handlers call requireAdmin() directly", "Server-side object lookup and allowlisted write fields", "Explicit DTOs instead of full database rows"],
    gaps: ["Supabase RLS must be verified in the deployed project", "Admin cookie is not a per-user role system"],
  },
  {
    id: "A02",
    title: "Security misconfiguration",
    status: "implemented",
    summary: "Default credentials, public buckets, verbose errors and unnecessary services.",
    controls: ["Security header baseline and API no-store responses", "poweredByHeader disabled", "Private report bucket by default"],
    gaps: ["Production key restrictions and patching remain deployment duties"],
  },
  {
    id: "A03",
    title: "Software supply chain failures",
    status: "partial",
    summary: "Compromised dependencies, build pipelines or unsigned artifacts.",
    controls: ["Committed lockfile", "Reproducible asset setup script"],
    gaps: ["Add dependency review, npm audit and provenance in CI"],
  },
  {
    id: "A04",
    title: "Cryptographic failures",
    status: "partial",
    summary: "Plaintext secrets, weak hashing, missing transport protection or exposed keys.",
    controls: ["HMAC-SHA256 signed sessions", "Timing-safe verification", "HTTPS-only external calls"],
    gaps: ["Pin ADMIN_SESSION_SECRET and use a hashed admin password in production"],
  },
  {
    id: "A05",
    title: "Injection",
    status: "implemented",
    summary: "SQL, command or script injection from trusting user input.",
    controls: ["Drizzle parameterized queries", "Zod validation and unknown-key stripping", "Safe markdown subset and escaped React text"],
    gaps: ["Continue tightening CSP after report review"],
  },
  {
    id: "A06",
    title: "Insecure design",
    status: "partial",
    summary: "Missing threat modeling, abuse limits or business-flow protections.",
    controls: ["Report duplication checks and moderation states", "Unverified/expired labels in the UI", "Route-specific limits"],
    gaps: ["Shared rate limiting and anomaly alerts for public submissions"],
  },
  {
    id: "A07",
    title: "Authentication failures",
    status: "partial",
    summary: "Weak credentials, exposed sessions, missing MFA or poor expiry.",
    controls: ["HttpOnly, SameSite, production Secure cookie", "Eight-hour token expiry", "Throttled and logged login attempts"],
    gaps: ["No MFA, SSO or named admin accounts"],
  },
  {
    id: "A08",
    title: "Software or data integrity failures",
    status: "partial",
    summary: "Trusting unverified updates, webhooks, artifacts or client-side roles.",
    controls: ["No client-trusted role flags", "External responses transformed into local types", "No auto-update/webhook pipeline"],
    gaps: ["Add CI artifact signing if release automation is introduced"],
  },
  {
    id: "A09",
    title: "Security logging and alerting failures",
    status: "partial",
    summary: "No security events, no monitoring, or alerts that never fire.",
    controls: ["Structured stdout events for blocked/denied actions", "Credentials, bodies, query strings and raw IPs excluded"],
    gaps: ["No alert destination is configured in the repository"],
  },
  {
    id: "A10",
    title: "Mishandling exceptional conditions",
    status: "partial",
    summary: "Crashes, reveal-on-error behavior, race conditions and fail-open logic.",
    controls: ["Generic client errors", "Server-only error detail", "Explicit fallback modes for missing integrations"],
    gaps: ["Add error monitoring and parser fuzz tests"],
  },
];

export const API_RISKS: AuditRisk[] = [
  {
    id: "API1",
    title: "Broken object-level authorization",
    status: "partial",
    summary: "Changing an ID exposes another person's record (BOLA/IDOR).",
    controls: ["Admin report mutations require a valid session", "Server-side place/report lookups"],
    gaps: ["Saved favorites and itineraries depend on Supabase RLS ownership policies"],
  },
  {
    id: "API2",
    title: "Broken authentication",
    status: "partial",
    summary: "Token or session mistakes allow identity compromise.",
    controls: ["Signed expiring cookie", "Constant-time credential checks", "Throttled login"],
    gaps: ["Rotate secrets and add MFA for production"],
  },
  {
    id: "API3",
    title: "Broken object property authorization",
    status: "implemented",
    summary: "Mass assignment or excessive data exposure at the property level.",
    controls: ["Explicit Zod write schemas", "Unknown keys stripped", "Mapped allowlisted database columns"],
    gaps: ["Keep raw request spreads out of future writes"],
  },
  {
    id: "API4",
    title: "Unrestricted resource consumption",
    status: "partial",
    summary: "No body, rate, time or cost limits enables denial of service or billing abuse.",
    controls: ["Bounded JSON streaming", "5 MB image cap with early Content-Length check", "Route-specific rate limits"],
    gaps: ["In-process limiter is not shared across instances"],
  },
  {
    id: "API5",
    title: "Broken function-level authorization",
    status: "implemented",
    summary: "Regular users calling privileged endpoints.",
    controls: ["requireAdmin() inside every admin handler", "No middleware-only authorization"],
    gaps: ["Maintain this pattern for new admin routes"],
  },
  {
    id: "API6",
    title: "Unrestricted sensitive business flows",
    status: "partial",
    summary: "Automated spam or abuse of voting, posting and booking flows.",
    controls: ["Duplicate report checks", "Confirmation limits", "Moderation workflow"],
    gaps: ["Add reputation or CAPTCHA if abuse appears"],
  },
  {
    id: "API7",
    title: "Server-side request forgery",
    status: "partial",
    summary: "Server fetches a client-chosen URL and reaches internal services.",
    controls: ["Fixed server-side provider hosts", "No arbitrary fetch URL accepted from clients"],
    gaps: ["Validate the operator-supplied Overpass endpoint at deployment"],
  },
  {
    id: "API8",
    title: "Security misconfiguration",
    status: "implemented",
    summary: "Permissive CORS, debug endpoints and unsafe defaults.",
    controls: ["No wildcard credentialed CORS", "Security header baseline", "API no-store responses"],
    gaps: ["Remove unused keys and routes before launch"],
  },
  {
    id: "API9",
    title: "Improper inventory management",
    status: "partial",
    summary: "Old API versions and forgotten endpoints remain reachable.",
    controls: ["Single visible app/api route tree", "No intentional legacy version routes"],
    gaps: ["Add automated route inventory to release review"],
  },
  {
    id: "API10",
    title: "Unsafe consumption of APIs",
    status: "partial",
    summary: "Trusting third-party responses without validation, timeouts or limits.",
    controls: ["Typed local models for Google, Overpass, Open-Meteo and OpenAI", "Graceful labeled fallbacks"],
    gaps: ["Add strict runtime schema validation for every new provider"],
  },
];

export const CHECK_GROUPS: AuditCheckGroup[] = [
  {
    id: "nextjs",
    title: "Next.js and React",
    description: "Common framework mistakes from the Next.js data-security guide and OWASP cheat sheet.",
    checks: [
      { label: "Every route handler is public", status: "implemented", detail: "Admin authorization is repeated inside each handler." },
      { label: "Server Actions are direct POST endpoints", status: "implemented", detail: "No authorization depends on a page redirect." },
      { label: "Middleware is not the auth boundary", status: "implemented", detail: "Sensitive handlers call requireAdmin() directly." },
      { label: "Client input is never trusted", status: "implemented", detail: "Zod validates payloads; roles never come from the browser." },
      { label: "Secrets stay server-only", status: "implemented", detail: "NEXT_PUBLIC_* is reserved for intentionally public values." },
      { label: "Framework patching", status: "deployment", detail: "Keep Next.js and transitive packages updated in CI." },
    ],
  },
  {
    id: "supabase",
    title: "Supabase and storage",
    description: "Database and object-store controls that must hold in the deployed project.",
    checks: [
      { label: "RLS on user-owned tables", status: "deployment", detail: "Favorites and itineraries must scope rows to auth.uid()." },
      { label: "Least-privilege grants", status: "deployment", detail: "Revoke broad grants before adding narrow policies." },
      { label: "Owner checks on writes", status: "deployment", detail: "Use with check to constrain user_id on insert/update." },
      { label: "Service-role key server-only", status: "implemented", detail: "Used only by server routes and scripts; never prefixed NEXT_PUBLIC_." },
      { label: "Private report bucket", status: "implemented", detail: "Created with public: false and served via signed URLs." },
      { label: "Validated object paths", status: "implemented", detail: "Only app-generated reports/UUID paths are accepted." },
    ],
  },
  {
    id: "maps",
    title: "Google Maps and third parties",
    description: "Key handling and external provider hygiene.",
    checks: [
      { label: "Separate browser and server keys", status: "implemented", detail: "Distinct NEXT_PUBLIC and server-only variables are documented." },
      { label: "Restrict keys", status: "deployment", detail: "Browser by referrer; server by API and IP." },
      { label: "Delete unused keys", status: "deployment", detail: "Review the cloud project and remove stale credentials." },
      { label: "Budgets and usage alerts", status: "deployment", detail: "Configure provider billing alerts." },
      { label: "Validate external responses", status: "partial", detail: "Typed transforms exist; add strict schema checks for new providers." },
    ],
  },
  {
    id: "operations",
    title: "People and operations",
    description: "The human controls that source code cannot enforce.",
    checks: [
      { label: "Unique admin password and secret", status: "deployment", detail: "Set ADMIN_PASSWORD_SHA256 and ADMIN_SESSION_SECRET." },
      { label: "MFA or SSO", status: "open", detail: "Not implemented; recommended before public launch." },
      { label: "Log alerts", status: "open", detail: "Structured events exist but need a sink and alert rules." },
      { label: "Backups and restore drills", status: "deployment", detail: "Schedule backups and test a restore." },
      { label: "Access revocation", status: "deployment", detail: "Rotate shared secrets when team members leave." },
      { label: "Incident plan", status: "open", detail: "Assign an owner and disclosure path through /contact." },
    ],
  },
];

export const AUDIT_SOURCES = [
  { label: "OWASP Top 10:2025", href: "https://top10.owasp.org/2025/", note: "Web application risk list" },
  { label: "OWASP API Security Top 10", href: "https://api-security.owasp.org/editions/2023/en/0x11-t10/", note: "API risk list" },
  { label: "Next.js data security", href: "https://nextjs.org/docs/app/guides/data-security", note: "Framework guidance" },
  { label: "OWASP Next.js cheat sheet", href: "https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html", note: "Framework controls" },
  { label: "Supabase RLS", href: "https://supabase.com/docs/guides/database/postgres/row-level-security", note: "Database controls" },
  { label: "Supabase storage access", href: "https://supabase.com/docs/guides/storage/security/access-control", note: "Object-store controls" },
  { label: "Google Maps API security", href: "https://developers.google.com/maps/api-security-best-practices", note: "Key and billing guidance" },
];

export const ALL_AUDIT_RISKS: Array<AuditRisk & { group: "Web" | "API" }> = [
  ...WEB_RISKS.map((risk) => ({ ...risk, group: "Web" as const })),
  ...API_RISKS.map((risk) => ({ ...risk, group: "API" as const })),
];
