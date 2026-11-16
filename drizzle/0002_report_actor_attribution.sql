ALTER TABLE "community_reports" ADD COLUMN "moderated_by_email" text;--> statement-breakpoint
ALTER TABLE "report_moderation_events" ADD COLUMN "actor_email" text;