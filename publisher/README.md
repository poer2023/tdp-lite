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
