-- API platform baseline migration
-- Run in maintenance window before cutover.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- posts: keep (locale, slug) unique, drop global slug unique, add lifecycle/audit columns.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_slug_key;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_locale_slug ON posts(locale, slug);

-- moments lifecycle fields
ALTER TABLE moments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE moments ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE moments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
ALTER TABLE moments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
UPDATE moments SET status = 'published' WHERE status IS NULL;
UPDATE moments SET published_at = created_at WHERE published_at IS NULL AND status = 'published';

-- gallery lifecycle and locale
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
UPDATE gallery SET locale = 'en' WHERE locale IS NULL;
UPDATE gallery SET status = 'published' WHERE status IS NULL;
UPDATE gallery SET published_at = created_at WHERE published_at IS NULL AND status = 'published';
CREATE INDEX IF NOT EXISTS idx_gallery_locale_status_created ON gallery(locale, status, created_at DESC);

-- media assets
CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key text NOT NULL UNIQUE,
  url text NOT NULL,
  mime text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  sha256 text,
  exif_json jsonb,
  status text NOT NULL DEFAULT 'pending_upload',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_assets_status_created ON media_assets(status, created_at DESC);

-- api keys upgrade (keep legacy columns for compatibility)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_id text;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS secret_ciphertext text;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scopes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
UPDATE api_keys SET key_id = id::text WHERE key_id IS NULL;
UPDATE api_keys SET scopes = permissions WHERE scopes = '[]'::jsonb AND permissions IS NOT NULL;
UPDATE api_keys SET secret_ciphertext = key_hash WHERE secret_ciphertext IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_id_unique ON api_keys(key_id);

-- request nonce (anti replay)
CREATE TABLE IF NOT EXISTS request_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(key_id, nonce)
);
CREATE INDEX IF NOT EXISTS idx_request_nonces_expires ON request_nonces(expires_at);

-- audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_key_id text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- AI jobs/results
CREATE TABLE IF NOT EXISTS ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  content_id text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_created ON ai_jobs(status, created_at);

CREATE TABLE IF NOT EXISTS ai_job_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_job_results_job_created ON ai_job_results(job_id, created_at DESC);

-- Idempotency store
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key text PRIMARY KEY,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys(created_at DESC);
