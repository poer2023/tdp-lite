# Shared Production R2 Setup (`tdp` + `tdp-lite`)

This project can now use the same production R2 settings as `/Users/wanghao/Project/tdp`.

## 1) Configure `tdp-lite` with production R2 values

Use one of the following:

```bash
# Option A: from a storage json export
pnpm r2:configure -- --from-storage-json /path/to/storage-config.json

# Option B: explicit values
pnpm r2:configure -- \
  --endpoint https://<account-id>.r2.cloudflarestorage.com \
  --region auto \
  --access-key-id <r2_access_key_id> \
  --secret-access-key <r2_secret_access_key> \
  --bucket <production_bucket> \
  --cdn-url https://<public_cdn_domain_or_r2_dev>
```

By default this updates both `S3_*` and compatibility aliases (`CLOUDFLARE_R2_*`).

## 2) Validate connectivity and permissions

```bash
# Bucket reachability
pnpm r2:check

# Optional: write/delete probe object
pnpm r2:check -- --put-delete
```

## 3) Runtime behavior notes

- `S3_*` values are preferred over `CLOUDFLARE_R2_*` values.
- `S3_BUCKET` is required (no implicit fallback bucket).
- Generated URLs use `S3_CDN_URL` (or `R2_PUBLIC_URL` fallback).
- Object keys remain at bucket root with date-based paths, e.g. `2026/02/16/<id>.jpg`.

## 4) Security

- If any API key/token was shared in chat or logs, rotate it in your platform immediately.
