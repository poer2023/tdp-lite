-- Search snapshots: locale-scoped persisted snapshot JSON for lightweight frontend search reads

CREATE TABLE IF NOT EXISTS search_snapshots (
  locale text PRIMARY KEY,
  snapshot_json jsonb NOT NULL,
  generated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_snapshots_updated_at
ON search_snapshots(updated_at DESC);
