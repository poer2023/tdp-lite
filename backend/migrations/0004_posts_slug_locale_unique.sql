-- Ensure post slug uniqueness is locale-scoped, not global.
-- Some older databases still have a legacy global unique constraint on slug.

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_slug_unique;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_slug_key;
DROP INDEX IF EXISTS posts_slug_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_locale_slug ON posts(locale, slug);
