-- Search snapshot refresh state: lightweight singleton flag so writes can request async rebuilds

CREATE TABLE IF NOT EXISTS search_snapshot_refresh_state (
  id smallint PRIMARY KEY,
  requested_at timestamptz,
  processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);
