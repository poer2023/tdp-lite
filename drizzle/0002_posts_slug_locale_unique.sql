ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_slug_unique";
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_slug_key";
DROP INDEX IF EXISTS "posts_slug_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_posts_locale_slug" ON "posts" USING btree ("locale","slug");
