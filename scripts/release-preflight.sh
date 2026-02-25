#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALLOW_DIRTY="false"

usage() {
  cat <<'EOF'
Usage:
  scripts/release-preflight.sh [--allow-dirty]

Checks:
  - git worktree clean (unless --allow-dirty)
  - tdp-lite: type-check, lint, test:layout, build
  - publisher: install, type-check, lint, build
  - docker compose config validation
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      continue
      ;;
    --allow-dirty)
      ALLOW_DIRTY="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[release-preflight][error] Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

if [[ "$ALLOW_DIRTY" != "true" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "[release-preflight][error] Worktree is not clean. Commit/stash changes first." >&2
    git status --short
    exit 1
  fi
fi

echo "[release-preflight] tdp-lite type-check"
pnpm type-check

echo "[release-preflight] tdp-lite lint"
pnpm lint

echo "[release-preflight] tdp-lite unit tests"
pnpm test:layout

echo "[release-preflight] tdp-lite build"
pnpm build

echo "[release-preflight] publisher install"
pnpm -C publisher install --frozen-lockfile

echo "[release-preflight] publisher type-check"
pnpm -C publisher type-check

echo "[release-preflight] publisher lint"
pnpm -C publisher lint

echo "[release-preflight] publisher build"
pnpm -C publisher build

echo "[release-preflight] docker compose config"
docker compose -f docker-compose.yml config >/dev/null

echo "[release-preflight] all checks passed"
