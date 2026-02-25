#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${COOLIFY_ENV_FILE:-$ROOT_DIR/.env.coolify}"
DRY_RUN="false"

COOLIFY_CONTEXT="${COOLIFY_CONTEXT:-}"
COOLIFY_SERVER_UUID="${COOLIFY_SERVER_UUID:-}"
COOLIFY_PROJECT_UUID="${COOLIFY_PROJECT_UUID:-}"
COOLIFY_ENVIRONMENT_UUID="${COOLIFY_ENVIRONMENT_UUID:-}"
COOLIFY_ENVIRONMENT_NAME="${COOLIFY_ENVIRONMENT_NAME:-}"
COOLIFY_PUBLISHER_NAME="${COOLIFY_PUBLISHER_NAME:-tdp-publisher}"
COOLIFY_PUBLISHER_UUID="${COOLIFY_PUBLISHER_UUID:-}"
COOLIFY_REPO_URL="${COOLIFY_REPO_URL:-https://github.com/poer2023/tdp-lite}"
COOLIFY_REPO_BRANCH="${COOLIFY_REPO_BRANCH:-main}"
COOLIFY_PUBLISHER_BASE_DIRECTORY="${COOLIFY_PUBLISHER_BASE_DIRECTORY:-/publisher}"
COOLIFY_PUBLISHER_PORT="${COOLIFY_PUBLISHER_PORT:-3100}"
COOLIFY_PUBLISHER_HEALTH_PATH="${COOLIFY_PUBLISHER_HEALTH_PATH:-/}"

COOLIFY_LITE_UUID="${COOLIFY_LITE_UUID:-}"
COOLIFY_LITE_NAME="${COOLIFY_LITE_NAME:-tdp-lite}"
COOLIFY_PUBLISH_TARGET_BASE_URL="${COOLIFY_PUBLISH_TARGET_BASE_URL:-}"
NEXT_PUBLIC_PUBLISHER_URL="${NEXT_PUBLIC_PUBLISHER_URL:-}"
TDP_INTERNAL_KEY_ID="${TDP_INTERNAL_KEY_ID:-}"
TDP_INTERNAL_KEY_SECRET="${TDP_INTERNAL_KEY_SECRET:-}"
COOLIFY_API_URL="${COOLIFY_API_URL:-}"
COOLIFY_API_TOKEN="${COOLIFY_API_TOKEN:-}"

usage() {
  cat <<'EOF'
Usage:
  scripts/coolify-ensure-publisher.sh [--env-file <path>] [--dry-run]

Purpose:
  Ensure publisher has an independent Coolify application.
  If missing, create it from current monorepo with base-directory=/publisher.
  Then sync core env vars for publisher publish flow.
EOF
}

log() {
  printf '%s\n' "[coolify-ensure-publisher] $*"
}

warn() {
  printf '%s\n' "[coolify-ensure-publisher][warn] $*" >&2
}

die() {
  printf '%s\n' "[coolify-ensure-publisher][error] $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  log "Loading env: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

run_coolify() {
  if [[ -n "$COOLIFY_CONTEXT" ]]; then
    coolify --context "$COOLIFY_CONTEXT" "$@"
  else
    coolify "$@"
  fi
}

get_context_field() {
  local field="$1"
  local context_name="$2"
  coolify context list --format json | jq -r --arg c "$context_name" --arg f "$field" '.[] | select(.name == $c) | .[$f]' | head -n1
}

app_list_json="$(run_coolify app list --format json)"

if [[ -z "$COOLIFY_PUBLISHER_UUID" ]]; then
  COOLIFY_PUBLISHER_UUID="$(jq -r --arg name "$COOLIFY_PUBLISHER_NAME" '.[] | select(.name == $name) | .uuid' <<<"$app_list_json" | head -n1)"
fi

resolve_lite_uuid() {
  if [[ -n "$COOLIFY_LITE_UUID" ]]; then
    printf '%s' "$COOLIFY_LITE_UUID"
    return 0
  fi
  jq -r --arg name "$COOLIFY_LITE_NAME" '.[] | select(.name == $name) | .uuid' <<<"$app_list_json" | head -n1
}

resolve_lite_fqdn() {
  local lite_uuid
  lite_uuid="$(resolve_lite_uuid)"
  [[ -z "$lite_uuid" ]] && return 1
  run_coolify app get "$lite_uuid" --format json | jq -r '.fqdn // ""'
}

resolve_environment_name() {
  if [[ -n "$COOLIFY_ENVIRONMENT_NAME" ]]; then
    printf '%s' "$COOLIFY_ENVIRONMENT_NAME"
    return 0
  fi
  [[ -z "$COOLIFY_PROJECT_UUID" ]] && return 1

  local project_json env_name
  project_json="$(run_coolify project get "$COOLIFY_PROJECT_UUID" --format json 2>/dev/null || true)"
  [[ -z "$project_json" ]] && return 1

  if [[ -n "$COOLIFY_ENVIRONMENT_UUID" ]]; then
    env_name="$(jq -r --arg uuid "$COOLIFY_ENVIRONMENT_UUID" '.environments[]? | select(.uuid == $uuid) | .name' <<<"$project_json" | head -n1)"
  else
    env_name="$(jq -r '.environments[0].name // ""' <<<"$project_json")"
  fi

  [[ -z "$env_name" || "$env_name" == "null" ]] && return 1
  printf '%s' "$env_name"
}

create_publisher_with_env_uuid() {
  local output
  set +e
  output="$(run_coolify app create public \
    --server-uuid "$COOLIFY_SERVER_UUID" \
    --project-uuid "$COOLIFY_PROJECT_UUID" \
    --environment-uuid "$COOLIFY_ENVIRONMENT_UUID" \
    --name "$COOLIFY_PUBLISHER_NAME" \
    --git-repository "$COOLIFY_REPO_URL" \
    --git-branch "$COOLIFY_REPO_BRANCH" \
    --build-pack nixpacks \
    --base-directory "$COOLIFY_PUBLISHER_BASE_DIRECTORY" \
    --ports-exposes "$COOLIFY_PUBLISHER_PORT" \
    --health-check-enabled \
    --health-check-path "$COOLIFY_PUBLISHER_HEALTH_PATH" \
    --format json 2>&1)"
  local status=$?
  set -e
  printf '%s' "$output"
  return "$status"
}

create_publisher_with_env_name() {
  local env_name="$1"
  local output
  set +e
  output="$(run_coolify app create public \
    --server-uuid "$COOLIFY_SERVER_UUID" \
    --project-uuid "$COOLIFY_PROJECT_UUID" \
    --environment-name "$env_name" \
    --name "$COOLIFY_PUBLISHER_NAME" \
    --git-repository "$COOLIFY_REPO_URL" \
    --git-branch "$COOLIFY_REPO_BRANCH" \
    --build-pack nixpacks \
    --base-directory "$COOLIFY_PUBLISHER_BASE_DIRECTORY" \
    --ports-exposes "$COOLIFY_PUBLISHER_PORT" \
    --health-check-enabled \
    --health-check-path "$COOLIFY_PUBLISHER_HEALTH_PATH" \
    --format json 2>&1)"
  local status=$?
  set -e
  printf '%s' "$output"
  return "$status"
}

if [[ -z "$COOLIFY_PUBLISHER_UUID" ]]; then
  [[ -z "$COOLIFY_SERVER_UUID" ]] && die "COOLIFY_SERVER_UUID is required to create publisher app."
  [[ -z "$COOLIFY_PROJECT_UUID" ]] && die "COOLIFY_PROJECT_UUID is required to create publisher app."

  log "Publisher app not found. Creating independent app in Coolify..."

  if [[ "$DRY_RUN" == "true" ]]; then
    if [[ -n "$COOLIFY_ENVIRONMENT_UUID" ]]; then
      log "[dry-run] Create strategy: environment UUID ($COOLIFY_ENVIRONMENT_UUID), fallback to environment name when needed."
    else
      log "[dry-run] Create strategy: environment name (resolved from project)."
    fi
    log "[dry-run] Skip create app."
  else
    create_json=""
    create_status=1

    if [[ -n "$COOLIFY_ENVIRONMENT_UUID" ]]; then
      log "Create attempt #1 via environment UUID: $COOLIFY_ENVIRONMENT_UUID"
      if create_json="$(create_publisher_with_env_uuid)"; then
        create_status=0
      else
        create_status=$?
      fi
    fi

    if [[ "$create_status" -ne 0 ]]; then
      COOLIFY_ENVIRONMENT_NAME="$(resolve_environment_name || true)"
      [[ -z "$COOLIFY_ENVIRONMENT_NAME" ]] && die "Unable to resolve environment name for publisher creation."
      warn "Create by environment UUID failed. Fallback to environment name: $COOLIFY_ENVIRONMENT_NAME"
      if create_json="$(create_publisher_with_env_name "$COOLIFY_ENVIRONMENT_NAME")"; then
        create_status=0
      else
        create_status=$?
      fi
    fi

    if [[ "$create_status" -ne 0 ]]; then
      die "Failed to create publisher app. Coolify output: $create_json"
    fi

    COOLIFY_PUBLISHER_UUID="$(jq -r '.uuid // .data.uuid // ""' <<<"$create_json")"
    if [[ -z "$COOLIFY_PUBLISHER_UUID" ]]; then
      die "Failed to parse publisher UUID from Coolify create response."
    fi
    log "Created publisher app uuid=$COOLIFY_PUBLISHER_UUID"
  fi
else
  log "Publisher app already exists: uuid=$COOLIFY_PUBLISHER_UUID"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  log "[dry-run] Skip env sync."
  exit 0
fi

[[ -z "$COOLIFY_PUBLISH_TARGET_BASE_URL" ]] && COOLIFY_PUBLISH_TARGET_BASE_URL="$(resolve_lite_fqdn || true)"
if [[ -z "$NEXT_PUBLIC_PUBLISHER_URL" ]]; then
  NEXT_PUBLIC_PUBLISHER_URL="$(run_coolify app get "$COOLIFY_PUBLISHER_UUID" --format json | jq -r '.fqdn // ""')"
fi

tmp_env="$(mktemp)"
tmp_updates="$(mktemp)"
cleanup() {
  rm -f "$tmp_env" "$tmp_updates"
}
trap cleanup EXIT

{
  [[ -n "$NEXT_PUBLIC_PUBLISHER_URL" ]] && printf 'NEXT_PUBLIC_PUBLISHER_URL=%s\n' "$NEXT_PUBLIC_PUBLISHER_URL"
  [[ -n "$COOLIFY_PUBLISH_TARGET_BASE_URL" ]] && printf 'PUBLISH_TARGET_BASE_URL=%s\n' "$COOLIFY_PUBLISH_TARGET_BASE_URL"
  [[ -n "$TDP_INTERNAL_KEY_ID" ]] && printf 'TDP_INTERNAL_KEY_ID=%s\n' "$TDP_INTERNAL_KEY_ID"
  [[ -n "$TDP_INTERNAL_KEY_SECRET" ]] && printf 'TDP_INTERNAL_KEY_SECRET=%s\n' "$TDP_INTERNAL_KEY_SECRET"
} >"$tmp_env"

if [[ ! -s "$tmp_env" ]]; then
  warn "No env vars to sync. Set values in .env.coolify and run again if needed."
  exit 0
fi

log "Syncing publisher env vars..."
sync_failed=0
app_env_list_json="$(run_coolify app env list "$COOLIFY_PUBLISHER_UUID" --format json)"

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  [[ -z "$key" ]] && continue

  if jq -e --arg k "$key" '.[] | select(.key == $k and (.is_preview | not))' >/dev/null <<<"$app_env_list_json"; then
    printf '%s=%s\n' "$key" "$value" >>"$tmp_updates"
    log "Queued env update: $key"
  else
    if run_coolify app env create "$COOLIFY_PUBLISHER_UUID" --key "$key" --value "$value" >/dev/null; then
      log "Created env: $key"
    else
      warn "Failed to create env: $key"
      sync_failed=$((sync_failed + 1))
    fi
  fi
done <"$tmp_env"

if [[ -s "$tmp_updates" ]]; then
  ctx_name="${COOLIFY_CONTEXT:-$(coolify context list --format json | jq -r '.[] | select(.default == true) | .name' | head -n1)}"
  api_url="${COOLIFY_API_URL:-$(get_context_field fqdn "$ctx_name")}"
  api_token="${COOLIFY_API_TOKEN:-$(get_context_field token "$ctx_name")}"

  if [[ -z "$api_url" || "$api_url" == "null" || -z "$api_token" || "$api_token" == "null" ]]; then
    die "Cannot sync existing env vars: missing COOLIFY_API_URL / COOLIFY_API_TOKEN (or context token/fqdn)."
  fi

  payload="$(jq -Rn '
    [inputs
      | select(length > 0)
      | capture("^(?<key>[^=]+)=(?<value>.*)$")
      | {key: .key, value: .value}
    ] | {data: .}
  ' <"$tmp_updates")"

  update_status=1
  for attempt in 1 2 3; do
    set +e
    curl -fsS \
      -X PATCH \
      -H "Authorization: Bearer $api_token" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "${api_url%/}/api/v1/applications/${COOLIFY_PUBLISHER_UUID}/envs/bulk" >/dev/null
    update_status=$?
    set -e
    [[ "$update_status" -eq 0 ]] && break
    warn "Env bulk patch attempt ${attempt}/3 failed, retrying..."
    sleep "$attempt"
  done

  if [[ "$update_status" -eq 0 ]]; then
    log "Updated existing env vars via API bulk patch."
  else
    warn "Failed to update existing env vars via API bulk patch."
    sync_failed=$((sync_failed + 1))
  fi
fi

if [[ "$sync_failed" -gt 0 ]]; then
  warn "Publisher app is available, but env sync had ${sync_failed} issue(s). Re-run ensure command later or set envs manually in Coolify."
fi

log "Publisher app is ready: uuid=$COOLIFY_PUBLISHER_UUID"
