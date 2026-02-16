CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"file_url" text NOT NULL,
	"thumb_url" text,
	"title" text,
	"width" integer,
	"height" integer,
	"captured_at" timestamp with time zone,
	"camera" text,
	"lens" text,
	"focal_length" text,
	"aperture" text,
	"iso" integer,
	"latitude" double precision,
	"longitude" double precision,
	"is_live_photo" boolean DEFAULT false,
	"video_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb,
	"locale" text DEFAULT 'en' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"location" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "preview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"request_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_gallery_created" ON "gallery" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_gallery_locale_created" ON "gallery" USING btree ("locale","created_at");--> statement-breakpoint
CREATE INDEX "idx_moments_created" ON "moments" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_posts_locale_slug" ON "posts" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "idx_preview_sessions_expires" ON "preview_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_publish_idempotency_created" ON "publish_idempotency_keys" USING btree ("created_at");