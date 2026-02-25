-- Ensure preview session persistence and translation-key defaults for publish flow.
-- Requires 0001/0003 applied.

CREATE TABLE IF NOT EXISTS preview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preview_sessions_expires_at
ON preview_sessions(expires_at);

ALTER TABLE posts ALTER COLUMN translation_key SET DEFAULT gen_random_uuid();
ALTER TABLE moments ALTER COLUMN translation_key SET DEFAULT gen_random_uuid();
ALTER TABLE gallery ALTER COLUMN translation_key SET DEFAULT gen_random_uuid();
