-- Profile snapshots (singleton): synced GitHub / Apple Music payloads for lightweight frontend reads

CREATE TABLE IF NOT EXISTS profile_snapshots (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  github_json jsonb,
  music_json jsonb,
  derived_json jsonb,
  source_status_json jsonb,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_snapshots_synced_at
ON profile_snapshots(synced_at DESC NULLS LAST);
