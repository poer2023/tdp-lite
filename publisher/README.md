# tdp-publisher

Independent compose/preview/publish app for `tdp-lite`.

## Local development

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Set shared signing key values to match `tdp-lite`:

- `PUBLISH_TARGET_BASE_URL` must point to your Go API host (for example `tdp-lite-api`), not the Next.js frontend host.
- `TDP_INTERNAL_KEY_ID` + `TDP_INTERNAL_KEY_SECRET` must match a Go API key in `tdp-lite` (legacy `PUBLISHER_KEY_*` env is still supported as fallback aliases).
- `PUBLISHER_AUTH_USERNAME` + `PUBLISHER_AUTH_PASSWORD` + `PUBLISHER_SESSION_SECRET` are required to unlock the publisher UI and API routes.
- `PUBLISHER_CRON_SECRET` is optional but recommended if you want an external daily sync worker to call publisher internal routes without a browser session. If omitted, publisher falls back to `TDP_INTERNAL_KEY_SECRET`.
- GitHub sync inside publisher uses:
  - `GITHUB_SYNC_API_BASE`
  - `GITHUB_SYNC_USERNAME`
  - `GITHUB_SYNC_TOKEN`
  - `GITHUB_SYNC_WINDOW_DAYS`
  - `GITHUB_SYNC_MAX_PAGES`
  - `PROFILE_SYNC_TIMEOUT_MS`

3. Run:

```bash
pnpm install
pnpm dev
```

Default local port: `3100`.

## Request flow

- `tdp-publisher` never writes DB directly.
- It signs requests and calls:
  - `POST /v1/media/uploads` (+ upload + `/complete`)
  - `POST /v1/previews/sessions`
  - `POST /v1/moments` / `POST /v1/posts` / `POST /v1/gallery-items`
- Preview iframes are rendered by `tdp-lite`:
  - `/preview/card`
  - `/preview/detail`

## Internal GitHub Sync

- Route: `POST /api/internal/profile-sync/github`
- Auth:
  - publisher session cookie, or
  - `Authorization: Bearer $PUBLISHER_CRON_SECRET` (fallback: `TDP_INTERNAL_KEY_SECRET`)
- Response:
  - returns the normalized GitHub snapshot payload (`heatmap`, `recentPushes`, `totalCommits`, `totalPushEvents`)
- Intended usage:
  - a thin daily sync worker calls this route
  - the worker merges GitHub data with other profile snapshot fields and writes the final snapshot to Go API
