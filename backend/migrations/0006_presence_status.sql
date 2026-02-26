-- Presence status (singleton row, city-level location)

CREATE TABLE IF NOT EXISTS presence_status (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  city text NOT NULL,
  region text,
  country text,
  country_code text,
  timezone text,
  source text,
  last_heartbeat_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_status_last_heartbeat
ON presence_status(last_heartbeat_at DESC);
