#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${TDP_INTERNAL_KEY_ID:?TDP_INTERNAL_KEY_ID is required}"
: "${TDP_INTERNAL_KEY_SECRET:?TDP_INTERNAL_KEY_SECRET is required}"

psql "${DATABASE_URL}" \
  -v ON_ERROR_STOP=1 \
  -v key_id="${TDP_INTERNAL_KEY_ID}" \
  -v key_secret="${TDP_INTERNAL_KEY_SECRET}" <<'SQL'
INSERT INTO api_keys (
  name,
  key_hash,
  permissions,
  key_id,
  secret_ciphertext,
  scopes,
  created_at,
  updated_at
)
VALUES (
  'docker-publisher',
  encode(digest(:'key_secret', 'sha256'), 'hex'),
  '["media:write","preview:write","content:write"]'::jsonb,
  :'key_id',
  :'key_secret',
  '["media:write","preview:write","content:write"]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (key_id)
DO UPDATE SET
  key_hash = EXCLUDED.key_hash,
  permissions = EXCLUDED.permissions,
  secret_ciphertext = EXCLUDED.secret_ciphertext,
  scopes = EXCLUDED.scopes,
  revoked_at = NULL,
  updated_at = NOW();
SQL

echo "Publisher API key synced."
