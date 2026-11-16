CREATE TABLE "community_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"place_slug" text NOT NULL,
	"category" text NOT NULL,
	"issue" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderation_status" text DEFAULT 'pending' NOT NULL,
	"moderation_reason" text,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"reporter_user_id" uuid,
	"reporter_hash" text,
	"confirmations_still" integer DEFAULT 0 NOT NULL,
	"confirmations_cleared" integer DEFAULT 0 NOT NULL,
	"confirmations_incorrect" integer DEFAULT 0 NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_reports_category_check" CHECK (category in ('crowd', 'road_transport', 'destination_condition', 'weather_environment', 'pricing_experience', 'general_update')),
	CONSTRAINT "community_reports_severity_check" CHECK (severity in ('info', 'low', 'medium', 'high', 'critical')),
	CONSTRAINT "community_reports_status_check" CHECK (status in ('active', 'resolved', 'expired', 'rejected', 'pending')),
	CONSTRAINT "community_reports_moderation_check" CHECK (moderation_status in ('pending', 'approved', 'rejected', 'flagged'))
);
--> statement-breakpoint
ALTER TABLE "community_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_confirmations" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"voter_hash" text NOT NULL,
	"voter_user_id" uuid,
	"vote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_confirmations_vote_check" CHECK (vote in ('still_happening', 'no_longer_happening', 'incorrect'))
);
--> statement-breakpoint
ALTER TABLE "report_confirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_moderation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_moderation_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_place_slug_places_slug_fk" FOREIGN KEY ("place_slug") REFERENCES "public"."places"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_confirmations" ADD CONSTRAINT "report_confirmations_report_id_community_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."community_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_moderation_events" ADD CONSTRAINT "report_moderation_events_report_id_community_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."community_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_reports_place_created_idx" ON "community_reports" USING btree ("place_slug","created_at");--> statement-breakpoint
CREATE INDEX "community_reports_status_idx" ON "community_reports" USING btree ("status","moderation_status","created_at");--> statement-breakpoint
CREATE INDEX "community_reports_expires_idx" ON "community_reports" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "report_confirmations_report_idx" ON "report_confirmations" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_confirmations_unique_vote_idx" ON "report_confirmations" USING btree ("report_id","voter_hash");--> statement-breakpoint
CREATE INDEX "report_moderation_events_report_idx" ON "report_moderation_events" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE POLICY "public read visible community reports" ON "community_reports" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (moderation_status in ('approved', 'pending') and status in ('active', 'pending', 'resolved', 'expired'));--> statement-breakpoint
CREATE POLICY "public read report confirmations" ON "report_confirmations" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);