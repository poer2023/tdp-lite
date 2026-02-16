# TDP Lite

## Architecture

- Frontend display pages (`/`, `/[locale]/posts`, `/[locale]/moments`, `/[locale]/gallery`, detail pages) read directly from the local PostgreSQL database via Next server code.
- Go backend (`backend/`) handles operation capabilities: content write lifecycle, media upload workflow, AI jobs, keys, and preview sessions.
- Preview pages (`/preview/card`, `/preview/detail`) depend on Go preview session payload APIs.
- Search uses dual-source fallback behind Next route `/api/search`:
  - Primary source: `TDP_SEARCH_PRIMARY=next|go` (default `next`)
  - Automatic fallback on primary network/timeout/5xx failures.

## Local Development

- Frontend only (display pages, DB read path):
  - `pnpm dev`
- Full stack (frontend + Go API + worker):
  - `pnpm dev:all`

## Backend

- Start API: `pnpm backend:api`
- Start worker: `pnpm backend:worker`
- Run migrations: `pnpm backend:migrate`

## CI/CD

- CI workflow: `.github/workflows/ci.yml`
  - Frontend quality gates: `pnpm type-check`, `pnpm lint`, `pnpm test:layout`, `pnpm build`
  - Backend quality gates: `cd backend && go test ./... && go build ./...`
  - Integration smoke:
    - Start PostgreSQL service
    - Apply `drizzle` + `backend` migrations
    - Run Next + Go API and verify:
      - Public pages are reachable
      - Search source/fallback headers are correct
      - Preview degrades gracefully when Go API is unavailable

- CD workflow: `.github/workflows/cd.yml`
  - Triggered after `CI` succeeds on `main` (or manual dispatch)
  - Builds release bundle artifacts (`tdp-api`, `tdp-worker`, OpenAPI, migrations)
  - Optional Vercel production deploy when all required secrets are set:
    - `VERCEL_TOKEN`
    - `VERCEL_ORG_ID`
    - `VERCEL_PROJECT_ID`
