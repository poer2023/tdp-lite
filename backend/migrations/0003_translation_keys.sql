-- Translation pairing baseline for i18n switching.
-- Requires 0001_api_platform.sql applied.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS translation_key uuid;
UPDATE posts SET translation_key = gen_random_uuid() WHERE translation_key IS NULL;
ALTER TABLE posts ALTER COLUMN translation_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_translation_locale ON posts(translation_key, locale);

ALTER TABLE moments ADD COLUMN IF NOT EXISTS translation_key uuid;
UPDATE moments SET translation_key = gen_random_uuid() WHERE translation_key IS NULL;
ALTER TABLE moments ALTER COLUMN translation_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_moments_translation_locale ON moments(translation_key, locale);

ALTER TABLE gallery ADD COLUMN IF NOT EXISTS translation_key uuid;
UPDATE gallery SET translation_key = gen_random_uuid() WHERE translation_key IS NULL;
ALTER TABLE gallery ALTER COLUMN translation_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_translation_locale ON gallery(translation_key, locale);
