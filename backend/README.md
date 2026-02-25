# tdp-api / tdp-worker

Go backend for TDP Lite unified API.

This backend is responsible for operation capabilities (write lifecycle/media/AI/preview)
and public read APIs used by Lite display routes.

## Requirements

- Go 1.23+
- PostgreSQL 15+

## Run migrations

```bash
psql "$DATABASE_URL" -f backend/migrations/0001_api_platform.sql
psql "$DATABASE_URL" -f backend/migrations/0002_search_fts_indexes.sql
psql "$DATABASE_URL" -f backend/migrations/0003_translation_keys.sql
psql "$DATABASE_URL" -f backend/migrations/0004_posts_slug_locale_unique.sql
psql "$DATABASE_URL" -f backend/migrations/0005_preview_sessions_and_translation_defaults.sql
```

## Environment

Required:

- `DATABASE_URL`
- `TDP_PREVIEW_SECRET`

Optional:

- `TDP_API_ADDR` (default `:8080`)
- `TDP_APP_BASE_URL` (default `http://localhost:3000`)
- `TDP_TIMESTAMP_SKEW` (default `5m`)
- `TDP_NONCE_TTL` (default `10m`)
- `TDP_PREVIEW_TTL` (default `2h`)
- `TDP_JOB_POLL_INTERVAL` (default `3s`)

R2 (for pre-signed upload URL):

- `S3_ENDPOINT`
- `S3_REGION` (default `auto`)
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_CDN_URL`

## Start API

```bash
cd backend
go run ./cmd/tdp-api
```

## Start worker

```bash
cd backend
go run ./cmd/tdp-worker
```
