import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema for the View Kandy catalogue and per-user saves.
 *
 * Supabase owns the `auth` schema; favorites and itineraries therefore keep
 * `user_id` without a declarative FK here (the reference is added by
 * `supabase/auth-fk.sql` for projects that want database-level enforcement).
 * Access is additionally protected by RLS policies below.
 */

// Drizzle quotes custom type names as a single identifier, so the type must be
// unqualified. `extensions` is on the Supabase search_path; db-bootstrap also
// sets it explicitly for roles that lack it.
const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography";
  },
});

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#38bdf8"),
    icon: text("icon").notNull().default("map-pin"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("categories are public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
  ],
).enableRLS();

export const places = pgTable(
  "places",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug, { onUpdate: "cascade", onDelete: "restrict" }),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    address: text("address"),
    website: text("website"),
    phone: text("phone"),
    openingHours: text("opening_hours"),
    entryFeeLkr: numeric("entry_fee_lkr", { precision: 12, scale: 2 }),
    estimatedVisitMinutes: integer("estimated_visit_minutes").notNull(),
    accessibility: text("accessibility"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    indoor: boolean("indoor").notNull().default(false),
    bestTime: text("best_time"),
    practicalNotes: text("practical_notes"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    verificationSource: text("verification_source")
      .notNull()
      .default("View Kandy editorial seed"),
    verificationSourceUrl: text("verification_source_url"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    locationAccuracy: text("location_accuracy").notNull().default("approximate"),
    featured: boolean("featured").notNull().default(false),
    priority: doublePrecision("priority").notNull().default(0),
    location: geographyPoint("location").generatedAlwaysAs(
      sql`extensions.st_setsrid(extensions.st_makepoint("lng", "lat"), 4326)::extensions.geography`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("places_category_idx").on(table.categorySlug),
    index("places_featured_idx").on(table.featured, table.priority),
    index("places_location_gix").using("gist", table.location),
    check("places_lat_range", sql`${table.lat} between -90 and 90`),
    check("places_lng_range", sql`${table.lng} between -180 and 180`),
    check("places_visit_minutes_positive", sql`${table.estimatedVisitMinutes} > 0`),
    check(
      "places_entry_fee_nonnegative",
      sql`${table.entryFeeLkr} is null or ${table.entryFeeLkr} >= 0`,
    ),
    check(
      "places_verification_status",
      sql`${table.verificationStatus} in ('verified', 'partially_verified', 'unverified')`,
    ),
    check(
      "places_location_accuracy",
      sql`${table.locationAccuracy} in ('rooftop', 'approximate', 'district')`,
    ),
    pgPolicy("places are public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
  ],
).enableRLS();

export const placeImages = pgTable(
  "place_images",
  {
    id: text("id").primaryKey(),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    credit: text("credit"),
    license: text("license"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("place_images_place_idx").on(table.placeId, table.sortOrder),
    pgPolicy("place images are public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
  ],
).enableRLS();

export const verificationLogs = pgTable(
  "verification_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    source: text("source"),
    sourceUrl: text("source_url"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    actor: text("actor").notNull().default("service-role"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_logs_place_idx").on(table.placeId, table.createdAt)],
).enableRLS();

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull(),
    placeSlug: text("place_slug")
      .notNull()
      .references(() => places.slug, { onUpdate: "cascade", onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.placeSlug] }),
    index("favorites_user_idx").on(table.userId),
    pgPolicy("users read own favorites", {
      for: "select",
      to: "authenticated",
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("users insert own favorites", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("users delete own favorites", {
      for: "delete",
      to: "authenticated",
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export const itineraries = pgTable(
  "itineraries",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    data: jsonb("data").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("itineraries_user_idx").on(table.userId, table.createdAt),
    pgPolicy("users read own itineraries", {
      for: "select",
      to: "authenticated",
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("users insert own itineraries", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("users update own itineraries", {
      for: "update",
      to: "authenticated",
      using: sql`auth.uid() = user_id`,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("users delete own itineraries", {
      for: "delete",
      to: "authenticated",
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export const communityReports = pgTable(
  "community_reports",
  {
    id: text("id").primaryKey(),
    placeSlug: text("place_slug").notNull().references(() => places.slug, { onDelete: "cascade" }),
    category: text("category").notNull(),
    issue: text("issue").notNull(),
    severity: text("severity").notNull().default("info"),
    description: text("description").notNull(),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("pending"),
    moderationStatus: text("moderation_status").notNull().default("pending"),
    moderationReason: text("moderation_reason"),
    moderatedBy: uuid("moderated_by"),
    moderatedByEmail: text("moderated_by_email"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    reporterUserId: uuid("reporter_user_id"),
    reporterHash: text("reporter_hash"),
    confirmationsStill: integer("confirmations_still").notNull().default(0),
    confirmationsCleared: integer("confirmations_cleared").notNull().default(0),
    confirmationsIncorrect: integer("confirmations_incorrect").notNull().default(0),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("community_reports_place_created_idx").on(table.placeSlug, table.createdAt),
    index("community_reports_status_idx").on(table.status, table.moderationStatus, table.createdAt),
    index("community_reports_expires_idx").on(table.expiresAt),
    check(
      "community_reports_category_check",
      sql`category in ('crowd', 'road_transport', 'destination_condition', 'weather_environment', 'pricing_experience', 'general_update')`,
    ),
    check(
      "community_reports_severity_check",
      sql`severity in ('info', 'low', 'medium', 'high', 'critical')`,
    ),
    check(
      "community_reports_status_check",
      sql`status in ('active', 'resolved', 'expired', 'rejected', 'pending')`,
    ),
    check(
      "community_reports_moderation_check",
      sql`moderation_status in ('pending', 'approved', 'rejected', 'flagged')`,
    ),
    pgPolicy("public read visible community reports", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`moderation_status in ('approved', 'pending') and status in ('active', 'pending', 'resolved', 'expired')`,
    }),
  ],
).enableRLS();

export const reportConfirmations = pgTable(
  "report_confirmations",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull().references(() => communityReports.id, { onDelete: "cascade" }),
    voterHash: text("voter_hash").notNull(),
    voterUserId: uuid("voter_user_id"),
    vote: text("vote").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("report_confirmations_report_idx").on(table.reportId, table.createdAt),
    uniqueIndex("report_confirmations_unique_vote_idx").on(table.reportId, table.voterHash),
    check("report_confirmations_vote_check", sql`vote in ('still_happening', 'no_longer_happening', 'incorrect')`),
    pgPolicy("public read report confirmations", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`true`,
    }),
  ],
).enableRLS();

export const reportModerationEvents = pgTable(
  "report_moderation_events",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull().references(() => communityReports.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    reason: text("reason"),
    actorUserId: uuid("actor_user_id"),
    actorEmail: text("actor_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("report_moderation_events_report_idx").on(table.reportId, table.createdAt),
  ],
).enableRLS();

export type CategoryRow = typeof categories.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
export type PlaceInsert = typeof places.$inferInsert;
export type PlaceImageRow = typeof placeImages.$inferSelect;
export type VerificationLogRow = typeof verificationLogs.$inferSelect;
export type FavoriteRow = typeof favorites.$inferSelect;
export type ItineraryRow = typeof itineraries.$inferSelect;
export type CommunityReportRow = typeof communityReports.$inferSelect;
export type CommunityReportInsert = typeof communityReports.$inferInsert;
export type ReportConfirmationRow = typeof reportConfirmations.$inferSelect;
export type ReportModerationEventRow = typeof reportModerationEvents.$inferSelect;
