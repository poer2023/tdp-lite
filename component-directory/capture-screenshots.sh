#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/screenshots"

mkdir -p "$OUT_DIR"

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "agent-browser command not found." >&2
  echo "Install/enable agent-browser first, then retry." >&2
  exit 1
fi

if ! curl -fsS "$BASE_URL/zh" >/dev/null; then
  echo "Cannot access $BASE_URL/zh. Start the app first (e.g. pnpm dev)." >&2
  exit 1
fi

routes=(
  "zh-home|/zh"
  "zh-about|/zh/about"
  "zh-gallery|/zh/gallery"
  "zh-moments|/zh/moments"
  "zh-posts|/zh/posts"
  "zh-search|/zh/search"
  "admin-login|/admin/login"
  "test-moment-detail|/test/moment-detail"
  "test-text-moment-detail|/test/text-moment-detail"
  "test-stitch-details|/test/stitch-details"
)

agent-browser set viewport 1512 982 >/dev/null

for route in "${routes[@]}"; do
  name="${route%%|*}"
  path="${route##*|}"
  url="$BASE_URL$path"

  echo "[capture] $url"
  agent-browser open "$url" >/dev/null
  agent-browser wait --load networkidle >/dev/null || true
  agent-browser screenshot "$OUT_DIR/$name.png" >/dev/null
  echo "[saved] $OUT_DIR/$name.png"
done

agent-browser close >/dev/null || true

echo "Done. Screenshots written to: $OUT_DIR"
