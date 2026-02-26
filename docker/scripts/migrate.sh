#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"

echo "Ensuring pgcrypto extension exists"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

has_posts_table="$(psql "${DATABASE_URL}" -At -c "SELECT to_regclass('public.posts') IS NOT NULL;")"
if [ "${has_posts_table}" != "t" ]; then
  if [ ! -f /drizzle/0000_famous_captain_marvel.sql ]; then
    echo "Bootstrap schema file is missing: /drizzle/0000_famous_captain_marvel.sql" >&2
    exit 1
  fi
  echo "Bootstrapping base schema from drizzle/0000_famous_captain_marvel.sql"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f /drizzle/0000_famous_captain_marvel.sql
fi

for migration in \
  /migrations/0001_api_platform.sql \
  /migrations/0002_search_fts_indexes.sql \
  /migrations/0003_translation_keys.sql \
  /migrations/0004_posts_slug_locale_unique.sql \
  /migrations/0005_preview_sessions_and_translation_defaults.sql \
  /migrations/0006_presence_status.sql \
  /migrations/0007_profile_snapshots.sql
do
  echo "Applying ${migration}"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${migration}"
done

echo "Migrations applied successfully."
