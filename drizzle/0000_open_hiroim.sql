CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#38bdf8' NOT NULL,
	"icon" text DEFAULT 'map-pin' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"place_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_place_slug_pk" PRIMARY KEY("user_id","place_slug")
);
--> statement-breakpoint
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "itineraries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "place_images" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"credit" text,
	"license" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "place_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "places" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_slug" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"address" text,
	"website" text,
	"phone" text,
	"opening_hours" text,
	"entry_fee_lkr" numeric(12, 2),
	"estimated_visit_minutes" integer NOT NULL,
	"accessibility" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"indoor" boolean DEFAULT false NOT NULL,
	"best_time" text,
	"practical_notes" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"verification_source" text DEFAULT 'KandyVerse editorial seed' NOT NULL,
	"verification_source_url" text,
	"last_verified_at" timestamp with time zone,
	"location_accuracy" text DEFAULT 'approximate' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"priority" double precision DEFAULT 0 NOT NULL,
	"location" "geography" GENERATED ALWAYS AS (extensions.st_setsrid(extensions.st_makepoint("lng", "lat"), 4326)::extensions.geography) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_slug_unique" UNIQUE("slug"),
	CONSTRAINT "places_lat_range" CHECK ("places"."lat" between -90 and 90),
	CONSTRAINT "places_lng_range" CHECK ("places"."lng" between -180 and 180),
	CONSTRAINT "places_visit_minutes_positive" CHECK ("places"."estimated_visit_minutes" > 0),
	CONSTRAINT "places_entry_fee_nonnegative" CHECK ("places"."entry_fee_lkr" is null or "places"."entry_fee_lkr" >= 0),
	CONSTRAINT "places_verification_status" CHECK ("places"."verification_status" in ('verified', 'partially_verified', 'unverified')),
	CONSTRAINT "places_location_accuracy" CHECK ("places"."location_accuracy" in ('rooftop', 'approximate', 'district'))
);
--> statement-breakpoint
ALTER TABLE "places" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"source" text,
	"source_url" text,
	"verified_at" timestamp with time zone,
	"actor" text DEFAULT 'service-role' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_place_slug_places_slug_fk" FOREIGN KEY ("place_slug") REFERENCES "public"."places"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "place_images" ADD CONSTRAINT "place_images_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorites_user_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "itineraries_user_idx" ON "itineraries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "place_images_place_idx" ON "place_images" USING btree ("place_id","sort_order");--> statement-breakpoint
CREATE INDEX "places_category_idx" ON "places" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "places_featured_idx" ON "places" USING btree ("featured","priority");--> statement-breakpoint
CREATE INDEX "places_location_gix" ON "places" USING gist ("location");--> statement-breakpoint
CREATE INDEX "verification_logs_place_idx" ON "verification_logs" USING btree ("place_id","created_at");--> statement-breakpoint
CREATE POLICY "categories are public" ON "categories" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "users read own favorites" ON "favorites" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "users insert own favorites" ON "favorites" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "users delete own favorites" ON "favorites" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "users read own itineraries" ON "itineraries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "users insert own itineraries" ON "itineraries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "users update own itineraries" ON "itineraries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "users delete own itineraries" ON "itineraries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "place images are public" ON "place_images" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "places are public" ON "places" AS PERMISSIVE FOR SELECT TO public USING (true);