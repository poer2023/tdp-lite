#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_ENV_FILE="${ROOT_DIR}/.env.coolify"

ENV_FILE="${COOLIFY_ENV_FILE:-$DEFAULT_ENV_FILE}"
DEPLOY_MODE="${COOLIFY_DEPLOY_MODE:-cli}" # cli | api
TARGETS="${COOLIFY_TARGETS:-lite}"        # lite | api | publisher | all | lite,api,publisher
COOLIFY_CONTEXT="${COOLIFY_CONTEXT:-}"
COOLIFY_FORCE="${COOLIFY_FORCE:-false}"
COOLIFY_WAIT="${COOLIFY_WAIT:-true}"
COOLIFY_TIMEOUT_SECONDS="${COOLIFY_TIMEOUT_SECONDS:-900}"
COOLIFY_POLL_SECONDS="${COOLIFY_POLL_SECONDS:-8}"
COOLIFY_HEALTH_STRICT="${COOLIFY_HEALTH_STRICT:-true}"
COOLIFY_PUBLISHER_OPTIONAL_IN_ALL="${COOLIFY_PUBLISHER_OPTIONAL_IN_ALL:-true}"
DRY_RUN="false"

COOLIFY_LITE_NAME="${COOLIFY_LITE_NAME:-tdp-lite}"
COOLIFY_API_APP_NAME="${COOLIFY_API_APP_NAME:-tdp-lite-api,lite-api}"
COOLIFY_PUBLISHER_NAME="${COOLIFY_PUBLISHER_NAME:-tdp-publisher,publisher}"
COOLIFY_LITE_UUID="${COOLIFY_LITE_UUID:-}"
COOLIFY_API_APP_UUID="${COOLIFY_API_APP_UUID:-}"
COOLIFY_PUBLISHER_UUID="${COOLIFY_PUBLISHER_UUID:-}"
COOLIFY_LITE_HEALTH_URL="${COOLIFY_LITE_HEALTH_URL:-}"
COOLIFY_API_HEALTH_URL="${COOLIFY_API_HEALTH_URL:-}"
COOLIFY_PUBLISHER_HEALTH_URL="${COOLIFY_PUBLISHER_HEALTH_URL:-}"
COOLIFY_API_URL="${COOLIFY_API_URL:-}"
COOLIFY_API_TOKEN="${COOLIFY_API_TOKEN:-}"

APP_LIST_JSON=""

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy-coolify.sh [options]

Options:
  --targets <lite|api|publisher|all|lite,api,publisher>  Deploy targets (default: lite)
  --mode <cli|api>                                Deploy mode (default: cli)
  --context <name>                                Coolify context name (CLI mode)
  --force                                         Force deployment
  --no-wait                                       Trigger only, do not wait
  --env-file <path>                               Load env overrides from file
  --dry-run                                       Print actions without deploying
  -h, --help                                      Show help

Environment file defaults:
  .env.coolify in repo root (if present)

Notes:
  When targets=all, publisher failures are ignored by default
  (COOLIFY_PUBLISHER_OPTIONAL_IN_ALL=true).
EOF
}

log() {
  printf '%s\n' "[deploy-coolify] $*"
}

warn() {
  printf '%s\n' "[deploy-coolify][warn] $*" >&2
}

die() {
  printf '%s\n' "[deploy-coolify][error] $*" >&2
  exit 1
}

str_true() {
  local val="${1:-}"
  [[ "$val" == "1" || "$val" == "true" || "$val" == "TRUE" || "$val" == "yes" || "$val" == "YES" ]]
}

parse_args() {
  local args=("$@")
  local i=0
  while (( i < ${#args[@]} )); do
    case "${args[$i]}" in
      --targets)
        TARGETS="${args[$((i+1))]:-}"
        i=$((i+2))
        ;;
      --mode)
        DEPLOY_MODE="${args[$((i+1))]:-}"
        i=$((i+2))
        ;;
      --context)
        COOLIFY_CONTEXT="${args[$((i+1))]:-}"
        i=$((i+2))
        ;;
      --force)
        COOLIFY_FORCE="true"
        i=$((i+1))
        ;;
      --no-wait)
        COOLIFY_WAIT="false"
        i=$((i+1))
        ;;
      --env-file)
        ENV_FILE="${args[$((i+1))]:-}"
        i=$((i+2))
        ;;
      --dry-run)
        DRY_RUN="true"
        i=$((i+1))
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      --)
        i=$((i+1))
        ;;
      *)
        die "Unknown argument: ${args[$i]}"
        ;;
    esac
  done
}

# Pass 1: only discover env-file from CLI args.
parse_args "$@"

# Load env config file.
if [[ -f "$ENV_FILE" ]]; then
  log "Loading env: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Reset runtime flags from env after loading file.
DEPLOY_MODE="${COOLIFY_DEPLOY_MODE:-$DEPLOY_MODE}"
TARGETS="${COOLIFY_TARGETS:-$TARGETS}"
COOLIFY_CONTEXT="${COOLIFY_CONTEXT:-}"
COOLIFY_FORCE="${COOLIFY_FORCE:-$COOLIFY_FORCE}"
COOLIFY_WAIT="${COOLIFY_WAIT:-$COOLIFY_WAIT}"
COOLIFY_TIMEOUT_SECONDS="${COOLIFY_TIMEOUT_SECONDS:-$COOLIFY_TIMEOUT_SECONDS}"
COOLIFY_POLL_SECONDS="${COOLIFY_POLL_SECONDS:-$COOLIFY_POLL_SECONDS}"
COOLIFY_HEALTH_STRICT="${COOLIFY_HEALTH_STRICT:-$COOLIFY_HEALTH_STRICT}"
COOLIFY_PUBLISHER_OPTIONAL_IN_ALL="${COOLIFY_PUBLISHER_OPTIONAL_IN_ALL:-$COOLIFY_PUBLISHER_OPTIONAL_IN_ALL}"
COOLIFY_LITE_NAME="${COOLIFY_LITE_NAME:-$COOLIFY_LITE_NAME}"
COOLIFY_API_APP_NAME="${COOLIFY_API_APP_NAME:-$COOLIFY_API_APP_NAME}"
COOLIFY_PUBLISHER_NAME="${COOLIFY_PUBLISHER_NAME:-$COOLIFY_PUBLISHER_NAME}"
COOLIFY_LITE_UUID="${COOLIFY_LITE_UUID:-$COOLIFY_LITE_UUID}"
COOLIFY_API_APP_UUID="${COOLIFY_API_APP_UUID:-$COOLIFY_API_APP_UUID}"
COOLIFY_PUBLISHER_UUID="${COOLIFY_PUBLISHER_UUID:-$COOLIFY_PUBLISHER_UUID}"
COOLIFY_LITE_HEALTH_URL="${COOLIFY_LITE_HEALTH_URL:-$COOLIFY_LITE_HEALTH_URL}"
COOLIFY_API_HEALTH_URL="${COOLIFY_API_HEALTH_URL:-$COOLIFY_API_HEALTH_URL}"
COOLIFY_PUBLISHER_HEALTH_URL="${COOLIFY_PUBLISHER_HEALTH_URL:-$COOLIFY_PUBLISHER_HEALTH_URL}"
COOLIFY_API_URL="${COOLIFY_API_URL:-$COOLIFY_API_URL}"
COOLIFY_API_TOKEN="${COOLIFY_API_TOKEN:-$COOLIFY_API_TOKEN}"

# Pass 2: re-apply CLI args so CLI always wins over env file.
parse_args "$@"

run_coolify() {
  if [[ -n "$COOLIFY_CONTEXT" ]]; then
    coolify --context "$COOLIFY_CONTEXT" "$@"
  else
    coolify "$@"
  fi
}

get_app_list_json() {
  if [[ -z "$APP_LIST_JSON" ]]; then
    APP_LIST_JSON="$(run_coolify app list --format json)"
  fi
  printf '%s' "$APP_LIST_JSON"
}

find_uuid_by_names() {
  local names_csv="$1"
  local app_list
  local name
  app_list="$(get_app_list_json)"
  IFS=',' read -r -a names_arr <<< "$names_csv"
  for name in "${names_arr[@]}"; do
    name="$(echo "$name" | xargs)"
    [[ -z "$name" ]] && continue
    local uuid
    uuid="$(jq -r --arg n "$name" '.[] | select(.name == $n) | .uuid' <<<"$app_list" | head -n1)"
    if [[ -n "$uuid" && "$uuid" != "null" ]]; then
      printf '%s' "$uuid"
      return 0
    fi
  done
  return 1
}

get_context_field() {
  local field="$1"
  local context_name="$2"
  coolify context list --format json | jq -r --arg c "$context_name" --arg f "$field" '.[] | select(.name == $c) | .[$f]' | head -n1
}

get_latest_deployment_json() {
  local uuid="$1"
  run_coolify app deployments list "$uuid" --format json | jq -c '.[0] // {}'
}

trigger_deploy_cli() {
  local uuid="$1"
  if str_true "$COOLIFY_FORCE"; then
    run_coolify deploy uuid "$uuid" --force --format json >/dev/null 2>&1 || run_coolify deploy uuid "$uuid" --force >/dev/null
  else
    run_coolify deploy uuid "$uuid" --format json >/dev/null 2>&1 || run_coolify deploy uuid "$uuid" >/dev/null
  fi
}

trigger_deploy_api() {
  local uuid="$1"
  local base_url="$COOLIFY_API_URL"
  local token="$COOLIFY_API_TOKEN"

  if [[ -z "$base_url" || -z "$token" ]]; then
    local ctx="${COOLIFY_CONTEXT:-$(coolify context list --format json | jq -r '.[] | select(.default == true) | .name' | head -n1)}"
    [[ -z "$base_url" ]] && base_url="$(get_context_field fqdn "$ctx")"
    [[ -z "$token" ]] && token="$(get_context_field token "$ctx")"
  fi

  [[ -z "$base_url" || "$base_url" == "null" ]] && die "COOLIFY_API_URL is missing for API mode."
  [[ -z "$token" || "$token" == "null" ]] && die "COOLIFY_API_TOKEN is missing for API mode."

  curl -fsS -G \
    -H "Authorization: Bearer $token" \
    --data-urlencode "uuid=$uuid" \
    "${base_url%/}/api/v1/deploy" >/dev/null
}

wait_deployment() {
  local label="$1"
  local uuid="$2"
  local before_id="$3"
  local deadline=$(( $(date +%s) + COOLIFY_TIMEOUT_SECONDS ))

  while true; do
    local latest_json latest_id latest_status latest_uuid
    latest_json="$(get_latest_deployment_json "$uuid")"
    latest_id="$(jq -r '.id // 0' <<<"$latest_json")"
    latest_status="$(jq -r '.status // "unknown"' <<<"$latest_json")"
    latest_uuid="$(jq -r '.deployment_uuid // ""' <<<"$latest_json")"

    if [[ "$latest_id" =~ ^[0-9]+$ ]] && (( latest_id > before_id )); then
      case "$latest_status" in
        finished|success|successful)
          log "$label deployment finished (deployment_uuid=${latest_uuid})"
          return 0
          ;;
        failed|error|canceled|cancelled)
          warn "$label deployment failed (deployment_uuid=${latest_uuid}, status=${latest_status})"
          warn "Check logs: coolify app deployments logs $uuid $latest_uuid"
          return 1
          ;;
        *)
          log "$label deployment in progress (status=${latest_status}, deployment_uuid=${latest_uuid})"
          ;;
      esac
    else
      log "$label waiting for deployment job to appear..."
    fi

    if (( $(date +%s) > deadline )); then
      warn "$label deployment wait timeout (${COOLIFY_TIMEOUT_SECONDS}s)"
      return 1
    fi
    sleep "$COOLIFY_POLL_SECONDS"
  done
}

check_health_url() {
  local label="$1"
  local url="$2"
  [[ -z "$url" ]] && return 0
  log "Health check $label: $url"
  local ok="false"
  for _ in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      ok="true"
      break
    fi
    sleep 2
  done
  if [[ "$ok" == "true" ]]; then
    log "$label health check passed"
    return 0
  fi
  if str_true "$COOLIFY_HEALTH_STRICT"; then
    die "$label health check failed: $url"
  else
    warn "$label health check failed (ignored): $url"
  fi
}

deploy_one() {
  local label="$1"
  local uuid="$2"
  local health_url="$3"

  [[ -z "$uuid" ]] && die "Missing UUID for target '$label'."

  local before_json before_id
  before_json="$(get_latest_deployment_json "$uuid")"
  before_id="$(jq -r '.id // 0' <<<"$before_json")"

  log "Deploying $label (uuid=$uuid, mode=$DEPLOY_MODE)"
  if str_true "$DRY_RUN"; then
    log "[dry-run] Skip deploy trigger for $label"
    return 0
  fi

  case "$DEPLOY_MODE" in
    cli)
      trigger_deploy_cli "$uuid"
      ;;
    api)
      trigger_deploy_api "$uuid"
      ;;
    *)
      die "Unsupported deploy mode: $DEPLOY_MODE (expected cli|api)"
      ;;
  esac

  if str_true "$COOLIFY_WAIT"; then
    wait_deployment "$label" "$uuid" "${before_id:-0}"
  fi

  check_health_url "$label" "$health_url"
}

normalize_targets() {
  case "$TARGETS" in
    all)
      printf '%s\n' "api" "lite" "publisher"
      ;;
    *)
      IFS=',' read -r -a arr <<< "$TARGETS"
      for t in "${arr[@]}"; do
        t="$(echo "$t" | xargs)"
        [[ -n "$t" ]] && printf '%s\n' "$t"
      done
      ;;
  esac
}

if [[ -z "$COOLIFY_LITE_UUID" ]]; then
  COOLIFY_LITE_UUID="$(find_uuid_by_names "$COOLIFY_LITE_NAME" || true)"
fi
if [[ -z "$COOLIFY_API_APP_UUID" ]]; then
  COOLIFY_API_APP_UUID="$(find_uuid_by_names "$COOLIFY_API_APP_NAME" || true)"
fi
if [[ -z "$COOLIFY_PUBLISHER_UUID" ]]; then
  COOLIFY_PUBLISHER_UUID="$(find_uuid_by_names "$COOLIFY_PUBLISHER_NAME" || true)"
fi

log "Deploy targets: $TARGETS"
log "Mode: $DEPLOY_MODE"
[[ -n "$COOLIFY_CONTEXT" ]] && log "Context: $COOLIFY_CONTEXT"

while IFS= read -r target; do
  case "$target" in
    api)
      if [[ -z "$COOLIFY_API_APP_UUID" ]]; then
        die "API app UUID not found."
      fi
      deploy_one "api" "$COOLIFY_API_APP_UUID" "$COOLIFY_API_HEALTH_URL"
      ;;
    lite)
      deploy_one "lite" "$COOLIFY_LITE_UUID" "$COOLIFY_LITE_HEALTH_URL"
      ;;
    publisher)
      if [[ -z "$COOLIFY_PUBLISHER_UUID" ]]; then
        if [[ "$TARGETS" == "all" ]]; then
          warn "Publisher app UUID not found, skipped."
          continue
        fi
        die "Publisher app UUID not found."
      fi
      if [[ "$TARGETS" == "all" ]] && str_true "$COOLIFY_PUBLISHER_OPTIONAL_IN_ALL"; then
        if ! deploy_one "publisher" "$COOLIFY_PUBLISHER_UUID" "$COOLIFY_PUBLISHER_HEALTH_URL"; then
          warn "Publisher deploy failed but ignored (optional in all-target mode)."
        fi
      else
        deploy_one "publisher" "$COOLIFY_PUBLISHER_UUID" "$COOLIFY_PUBLISHER_HEALTH_URL"
      fi
      ;;
    *)
      die "Unsupported target: $target (expected lite|api|publisher|all)"
      ;;
  esac
done < <(normalize_targets)

log "Deploy flow completed."
