ALTER TABLE "posts" ADD COLUMN "translation_key" uuid;
UPDATE "posts" SET "translation_key" = gen_random_uuid() WHERE "translation_key" IS NULL;
ALTER TABLE "posts" ALTER COLUMN "translation_key" SET NOT NULL;
CREATE UNIQUE INDEX "idx_posts_translation_locale" ON "posts" USING btree ("translation_key","locale");
--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "translation_key" uuid;
UPDATE "moments" SET "translation_key" = gen_random_uuid() WHERE "translation_key" IS NULL;
ALTER TABLE "moments" ALTER COLUMN "translation_key" SET NOT NULL;
CREATE UNIQUE INDEX "idx_moments_translation_locale" ON "moments" USING btree ("translation_key","locale");
--> statement-breakpoint
ALTER TABLE "gallery" ADD COLUMN "translation_key" uuid;
UPDATE "gallery" SET "translation_key" = gen_random_uuid() WHERE "translation_key" IS NULL;
ALTER TABLE "gallery" ALTER COLUMN "translation_key" SET NOT NULL;
CREATE UNIQUE INDEX "idx_gallery_translation_locale" ON "gallery" USING btree ("translation_key","locale");
