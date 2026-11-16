import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { databaseConfigured, getDb } from "@/lib/db/client";
import { communityReports, reportConfirmations, reportModerationEvents } from "@/lib/db/schema";
import { REPORT_CATEGORIES, freshnessMinutes, freshnessLabel, type ReportCategoryKey } from "./config";
import { signReportImages } from "./storage";

export interface PublicReport {
  id: string;
  placeSlug: string;
  category: string;
  issue: string;
  severity: string;
  description: string;
  imageUrl: string | null;
  status: string;
  moderationStatus: string;
  confirmationsStill: number;
  confirmationsCleared: number;
  confirmationsIncorrect: number;
  lastConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  freshness: string;
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function voterHashFromRequest(ip: string | null, ua: string | null, userId?: string | null): string {
  return hashValue(`${userId ?? "anon"}|${ip ?? "unknown"}|${ua ?? "ua"}`);
}

function toPublic(row: typeof communityReports.$inferSelect): PublicReport {
  return {
    id: row.id,
    placeSlug: row.placeSlug,
    category: row.category,
    issue: row.issue,
    severity: row.severity,
    description: row.description,
    imageUrl: row.imageUrl,
    status: row.status,
    moderationStatus: row.moderationStatus,
    confirmationsStill: row.confirmationsStill,
    confirmationsCleared: row.confirmationsCleared,
    confirmationsIncorrect: row.confirmationsIncorrect,
    lastConfirmedAt: row.lastConfirmedAt ? row.lastConfirmedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    freshness: freshnessLabel(row.createdAt.toISOString(), row.expiresAt ? row.expiresAt.toISOString() : null, row.status, row.moderationStatus),
  };
}

export async function listReportsForPlace(placeSlug: string, limit = 30): Promise<PublicReport[]> {
  if (!databaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(communityReports)
    .where(and(eq(communityReports.placeSlug, placeSlug), inArray(communityReports.moderationStatus, ["pending", "approved"])))
    .orderBy(desc(communityReports.createdAt))
    .limit(limit);
  const now = new Date();
  const out: PublicReport[] = [];
  for (const r of rows) {
    const expired = r.expiresAt && r.expiresAt.getTime() < now.getTime() && r.status === "active";
    if (expired) {
      try {
        await db.update(communityReports).set({ status: "expired", updatedAt: now }).where(eq(communityReports.id, r.id));
        r.status = "expired";
        r.updatedAt = now;
      } catch { /* read path best-effort */ }
    }
    out.push(toPublic(r));
  }
  return signReportImages(out);
}

export async function listRecentReports(limit = 50): Promise<PublicReport[]> {
  if (!databaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(communityReports)
    .where(inArray(communityReports.moderationStatus, ["pending", "approved"]))
    .orderBy(desc(communityReports.createdAt))
    .limit(limit);
  const now = new Date();
  const out: PublicReport[] = [];
  for (const r of rows) {
    const expired = r.expiresAt && r.expiresAt.getTime() < now.getTime() && r.status === "active";
    if (expired) {
      try {
        await db.update(communityReports).set({ status: "expired", updatedAt: now }).where(eq(communityReports.id, r.id));
        r.status = "expired";
        r.updatedAt = now;
      } catch { /* best-effort */ }
    }
    out.push(toPublic(r));
  }
  return signReportImages(out);
}

export async function createReport(input: {
  placeSlug: string;
  category: ReportCategoryKey;
  issue: string;
  severity: string;
  description: string;
  imagePath?: string | null;
  reporterUserId?: string | null;
  reporterHash: string;
}): Promise<PublicReport> {
  if (!databaseConfigured()) throw new Error("Database is not configured.");
  if (!REPORT_CATEGORIES[input.category]) throw new Error("Invalid category.");
  const db = getDb();
  const id = `rpt_${randomUUID()}`;
  const now = new Date();

  // Basic duplicate suppression: the same reporter repeating the same
  // category/issue for the same place within 20 minutes is almost always a
  // double submit or an accidental refresh.
  const duplicateSince = new Date(now.getTime() - 20 * 60 * 1000);
  const [duplicate] = await db
    .select({ id: communityReports.id })
    .from(communityReports)
    .where(
      and(
        eq(communityReports.placeSlug, input.placeSlug),
        eq(communityReports.reporterHash, input.reporterHash),
        eq(communityReports.category, input.category),
        eq(communityReports.issue, input.issue),
        gt(communityReports.createdAt, duplicateSince),
      ),
    )
    .limit(1);
  if (duplicate) {
    throw new Error("A similar report from this device was submitted recently. Please wait before submitting again.");
  }

  const minutes = freshnessMinutes(input.category);
  // Pricing reports remain historically visible but are never presented as a
  // live current condition; everything else expires and is labelled stale.
  const expiresAt = input.category === "pricing_experience" ? null : new Date(now.getTime() + minutes * 60 * 1000);
  const rows = await db.insert(communityReports).values({
    id,
    placeSlug: input.placeSlug,
    category: input.category,
    issue: input.issue,
    severity: input.severity,
    description: input.description,
    imageUrl: input.imagePath ?? null,
    status: "pending",
    moderationStatus: "pending",
    reporterUserId: input.reporterUserId ?? null,
    reporterHash: input.reporterHash,
    confirmationsStill: 0,
    confirmationsCleared: 0,
    confirmationsIncorrect: 0,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  }).returning();
  const row = rows[0];
  if (!row) throw new Error("Failed to create report.");
  const [signed] = await signReportImages([toPublic(row)]);
  return signed ?? toPublic(row);
}

export async function confirmReport(input: {
  reportId: string;
  vote: "still_happening" | "no_longer_happening" | "incorrect";
  voterHash: string;
  voterUserId?: string | null;
}): Promise<PublicReport | null> {
  if (!databaseConfigured()) throw new Error("Database is not configured.");
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [report] = await tx.select().from(communityReports).where(eq(communityReports.id, input.reportId)).limit(1);
    if (!report) return null;
    if (!["active", "pending"].includes(report.status)) {
      throw new Error("This report is no longer open for confirmations.");
    }
    if (!["pending", "approved"].includes(report.moderationStatus)) {
      throw new Error("This report is not available for confirmations.");
    }
    if (report.expiresAt && report.expiresAt.getTime() < Date.now()) {
      throw new Error("This report has expired and is no longer open for confirmations.");
    }
    try {
      await tx.insert(reportConfirmations).values({
        id: `rcf_${randomUUID()}`,
        reportId: input.reportId,
        voterHash: input.voterHash,
        voterUserId: input.voterUserId ?? null,
        vote: input.vote,
        createdAt: new Date(),
      });
    } catch (e: any) {
      // unique violation = already voted
      if (String(e?.code) === "23505" || String(e?.message ?? "").toLowerCase().includes("unique")) {
        throw new Error("You have already submitted feedback for this report.");
      }
      throw e;
    }
    const updates: Record<string, any> = { lastConfirmedAt: new Date(), updatedAt: new Date() };
    if (input.vote === "still_happening") updates.confirmationsStill = sql`${communityReports.confirmationsStill} + 1`;
    if (input.vote === "no_longer_happening") updates.confirmationsCleared = sql`${communityReports.confirmationsCleared} + 1`;
    if (input.vote === "incorrect") updates.confirmationsIncorrect = sql`${communityReports.confirmationsIncorrect} + 1`;
    const [updated] = await tx.update(communityReports).set(updates).where(eq(communityReports.id, input.reportId)).returning();
    if (!updated) return null;
    const [signed] = await signReportImages([toPublic(updated)]);
    return signed ?? toPublic(updated);
  });
}

export async function moderateReport(input: {
  reportId: string;
  action: "approve" | "reject" | "resolve" | "flag";
  reason?: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<PublicReport | null> {
  if (!databaseConfigured()) throw new Error("Database is not configured.");
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [report] = await tx.select().from(communityReports).where(eq(communityReports.id, input.reportId)).limit(1);
    if (!report) return null;
    const now = new Date();
    const updates: Record<string, any> = {
      updatedAt: now,
      moderatedAt: now,
      moderatedBy: input.actorUserId ?? null,
      moderatedByEmail: input.actorEmail ?? null,
    };
    if (input.action === "approve") {
      updates.moderationStatus = "approved";
      updates.status = "active";
      updates.moderationReason = input.reason ?? null;
    } else if (input.action === "reject") {
      updates.moderationStatus = "rejected";
      updates.status = "rejected";
      updates.moderationReason = input.reason ?? "Rejected by moderator";
    } else if (input.action === "resolve") {
      updates.status = "resolved";
      updates.resolvedAt = now;
      if (report.moderationStatus === "pending") updates.moderationStatus = "approved";
      updates.moderationReason = input.reason ?? report.moderationReason;
    } else if (input.action === "flag") {
      updates.moderationStatus = "flagged";
      updates.moderationReason = input.reason ?? "Flagged for review";
    }
    const [updated] = await tx.update(communityReports).set(updates).where(eq(communityReports.id, input.reportId)).returning();
    await tx.insert(reportModerationEvents).values({
      id: `rme_${randomUUID()}`,
      reportId: input.reportId,
      action: input.action,
      reason: input.reason ?? null,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      createdAt: now,
    });
    if (!updated) return null;
    const [signed] = await signReportImages([toPublic(updated)]);
    return signed ?? toPublic(updated);
  });
}

export async function listReportsForModeration(limit = 100): Promise<PublicReport[]> {
  if (!databaseConfigured()) return [];
  const db = getDb();
  const rows = await db.select().from(communityReports).orderBy(desc(communityReports.createdAt)).limit(limit);
  return signReportImages(rows.map(toPublic));
}

export interface ModerationEvent {
  id: string;
  reportId: string;
  action: string;
  reason: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export async function listModerationEvents(reportId: string): Promise<ModerationEvent[]> {
  if (!databaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(reportModerationEvents)
    .where(eq(reportModerationEvents.reportId, reportId))
    .orderBy(desc(reportModerationEvents.createdAt));
  return rows.map((row) => ({
    id: row.id,
    reportId: row.reportId,
    action: row.action,
    reason: row.reason,
    actorUserId: row.actorUserId,
    actorEmail: row.actorEmail,
    createdAt: row.createdAt.toISOString(),
  }));
}
