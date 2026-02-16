-- Full-text search indexes for public search endpoint.
-- Requires 0001_api_platform.sql applied.

CREATE INDEX IF NOT EXISTS idx_posts_fts_search
ON posts
USING GIN (
  to_tsvector(
    'simple',
    COALESCE(title, '') || ' ' ||
    COALESCE(excerpt, '') || ' ' ||
    COALESCE(content, '') || ' ' ||
    COALESCE(tags::text, '')
  )
)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_moments_fts_search
ON moments
USING GIN (
  to_tsvector(
    'simple',
    COALESCE(content, '') || ' ' ||
    COALESCE(location->>'name', '')
  )
)
WHERE deleted_at IS NULL AND visibility = 'public' AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_gallery_fts_search
ON gallery
USING GIN (
  to_tsvector(
    'simple',
    COALESCE(title, '') || ' ' ||
    COALESCE(camera, '') || ' ' ||
    COALESCE(lens, '') || ' ' ||
    COALESCE(focal_length, '') || ' ' ||
    COALESCE(aperture, '') || ' ' ||
    COALESCE(iso::text, '')
  )
)
WHERE deleted_at IS NULL AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_posts_search_sort
ON posts (COALESCE(published_at, created_at) DESC, id DESC)
WHERE deleted_at IS NULL AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_moments_search_sort
ON moments (created_at DESC, id DESC)
WHERE deleted_at IS NULL AND visibility = 'public' AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_gallery_search_sort
ON gallery (created_at DESC, id DESC)
WHERE deleted_at IS NULL AND status = 'published';
