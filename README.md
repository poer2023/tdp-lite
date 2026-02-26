# TDP Lite

## 目标架构（精简解耦版）

### 1) 前台：Next 轻 SSR（主站）

- Next 作为唯一展示层，优先 SSR/ISR，减少运行时写操作。
- 前台仅依赖“托管内容源 + 搜索索引文件 + preview 跳转入口”，不直接连接业务 DB。
- 可静态页面（about、聚合页）优先 ISR；高时效详情页保留 SSR。

### 2) 内容源：托管化

- 内容统一迁移到托管内容源（Headless CMS / 对象存储 JSON / Git-based 内容仓）。
- 内容发布管线统一执行：
  1. 更新内容源；
  2. 触发 Next revalidate；
  3. 触发搜索索引重建。

### 3) 搜索：预生成索引

- 从“请求时双后端 fallback”迁移为“发布时生成索引 + 前台读取索引检索”。
- 将在线路由复杂度前移到发布管线，降低运行时依赖和故障面。

### 4) Preview：独立部署并与 Go 同侧

- preview 服务独立，和 Go API/worker 同侧部署。
- 前台主站仅保留 preview 跳转入口，不承载 preview session 业务。

### 5) 前台依赖瘦身

- 前台 runtime 仅保留渲染必需依赖。
- 后端/存储/鉴权依赖（如 `drizzle-orm`、`postgres`、`next-auth`、`@aws-sdk/client-s3`）按域迁移到 Go/preview/admin 服务。

### 6) CI：分层拆分

- 前台 CI：`type-check / lint / test / build`，不依赖 DB/Go。
- 后台 CI：Go test/build（可逐步加入 preview/API 契约测试）。
- 集成 E2E：独立流水线（手动触发 + 夜间定时），不阻塞前台常规 PR。

## 实施节奏（4 周）

1. 第 1 周：边界冻结
   - 梳理 SSR / ISR / 动态页面清单。
   - 明确“前台禁止直接连 DB”规则。
2. 第 2 周：内容托管接入
   - 先迁低风险页面（about/list）。
   - 保留旧链路灰度回退。
3. 第 3 周：搜索索引化
   - 发布时产出索引 JSON。
   - 前台改读索引检索。
   - 下线双源 fallback 路由。
4. 第 4 周：preview 与依赖瘦身 + CI 拆分
   - preview 并入 Go 部署域。
   - 前台删除后端依赖。
   - CI 调整为“前台快检 + 后台独立 + 集成异步”。

## 验收标准

- 前台 build 在无 DB / 无 Go 情况下可通过。
- 前台部署仅需内容源访问权限，不需业务数据库权限。
- 搜索不依赖在线后端查询。
- preview 故障不影响主站核心访问。
- CI 中前台 PR 不再被后端环境阻塞。

## Local Development

- Frontend only (display pages):
  - `pnpm dev`
- Full stack (frontend + Go API + worker):
  - `pnpm dev:all`

### Publisher App (same repo)

- Publisher source now lives in `publisher/` and is deployed as an independent service.
- Lite runtime never depends on publisher process health.
- `/admin` is non-blocking: it only shows publisher entry link when configured.

## Docker Compose（单仓库、双服务隔离）

1. 复制 compose 环境变量模板：
   - `cp docker/.env.compose.example .env.compose`
   - 必填强密钥：`NEXTAUTH_SECRET`、`TDP_PREVIEW_SECRET`、`TDP_INTERNAL_KEY_SECRET`
2. 启动 Lite 主链路（默认不启动 publisher）：
   - `docker compose --env-file .env.compose up -d`
3. 若需要发布工具，再启 publisher profile：
   - `docker compose --env-file .env.compose --profile publisher up -d`
4. 若需要每日同步 GitHub / Apple Music 快照，再启 sync profile：
   - `docker compose --env-file .env.compose --profile sync up -d profile-sync`

默认端口：

- Lite Web: `3000`
- Go API: `8080`
- Publisher: `3100`（仅在 `publisher` profile 启动时）

隔离保证：

- `lite-web` / `lite-api` / `lite-worker` 没有对 `publisher` 的运行依赖。
- `publisher` 挂掉、重启失败或关闭时，不影响 Lite 展示链路。
- `publisher` 仅在发布动作触发时调用 API；失败只影响发布动作本身。
- Compose 已启用 `lite-api` / `lite-web` / `publisher` 健康检查。
- `db` / `api` / `publisher` 默认仅绑定到 `127.0.0.1`（可通过 `*.BIND_HOST` 覆盖）。

## Coolify 发布（推荐）

目标：尽可能统一为 Coolify CLI/API 发布，减少手动操作。

1. 初始化配置：
   - `cp .env.coolify.example .env.coolify`
   - 按需修改 `COOLIFY_CONTEXT`、`COOLIFY_LITE_UUID`、`COOLIFY_API_APP_UUID`、健康检查 URL 等。
2. 如果 publisher 还没单独建应用，先执行：
   - `pnpm deploy:coolify:ensure-publisher`
   - 该命令会在 Coolify 创建独立 `tdp-publisher`（`base-directory=/publisher`）并同步核心 env。
   - `PUBLISH_TARGET_BASE_URL` 会默认自动解析到 `tdp-lite-api`（而不是 `tdp-lite` 前端 URL），并在写入前校验 `/healthz` 与 `/v1/previews/sessions`。
   - 当 env 有更新时，会自动触发 publisher 重部署，确保新变量立即生效。
   - 若创建时 `environment-uuid` 不兼容，会自动回退到 `environment-name`（可在 `.env.coolify` 配置 `COOLIFY_ENVIRONMENT_NAME`）。
3. 发布 API（推荐先发 API）：
   - `pnpm deploy:coolify:api`
4. 发布 Lite：
   - `pnpm deploy:coolify:lite`
5. 发布全部目标（api + lite + publisher，publisher 若未配置会自动跳过）：
   - `pnpm deploy:coolify:all`
   - 默认 `COOLIFY_PUBLISHER_OPTIONAL_IN_ALL=true`，即 publisher 失败不会阻断 lite 发布。
6. 发布前预演：
   - `pnpm deploy:coolify:dry-run`
7. 发布前硬化检查（建议）：
   - `pnpm release:preflight`

脚本说明（`scripts/deploy-coolify.sh`）：

- 默认 `cli` 模式：调用 `coolify deploy uuid`。
- 可切换 `api` 模式：`COOLIFY_DEPLOY_MODE=api`（使用 `/api/v1/deploy?uuid=`）。
- 支持按 UUID 或按名称自动发现应用。
- 支持 `api|lite|publisher|all` 多目标发布；`all` 会按 `api -> lite -> publisher` 顺序执行。
- 支持等待部署完成、失败即退出、部署后健康检查。
- `scripts/coolify-ensure-publisher.sh` 用于自动创建 publisher 独立应用。

### Lightweight Frontend Mode

- Display routes read public content from `TDP_API_BASE_URL` / `NEXT_PUBLIC_TDP_API_BASE_URL`.
- `src/lib/content/read.ts` is API-backed and degrades to empty results on backend errors.
- Default search source is Go (`TDP_SEARCH_PRIMARY=go`); keep `TDP_SEARCH_ALLOW_FALLBACK_TO_NEXT=false` to avoid DB fallback in frontend-only mode.


## Lightweight Frontend Build

- `pnpm build` can run without `DATABASE_URL` for frontend-only packaging.
- Display routes are API-backed and do not require local Postgres when running.
- `DATABASE_URL` is only needed for DB-backed internals (legacy search-next fallback / publish-side paths).

## Backend

- Start API: `pnpm backend:api`
- Start worker: `pnpm backend:worker`
- Run migrations: `pnpm backend:migrate`

## Realtime Presence

- Public read endpoint: `GET /v1/public/presence`
- Internal heartbeat write endpoint (signed key): `POST /v1/internal/presence`
- Online/offline is derived by heartbeat freshness (`TDP_PRESENCE_ONLINE_WINDOW`, default `3m`).
- Update presence quickly:
  - `pnpm presence:heartbeat -- --city Tokyo --country Japan --country-code JP --source manual`

## Profile Snapshot Sync (GitHub + Apple Music)

- Sync worker only writes snapshot to API:
  - pull source data -> normalize -> `POST /v1/internal/profile-snapshot`
- Frontend (`tdp-lite`) only reads:
  - `GET /v1/public/profile-snapshot`
- Failure isolation:
  - sync failure only affects data freshness, never blocks page rendering.
  - source partial failure preserves previous snapshot fields (no destructive overwrite).

Local run:

- One-shot sync:
  - `pnpm profile:sync`
- Loop mode (default 24h interval):
  - `pnpm profile:sync:loop`

Required env:

- `TDP_INTERNAL_KEY_ID`, `TDP_INTERNAL_KEY_SECRET`
- GitHub:
  - `GITHUB_SYNC_USERNAME` (required for GitHub sync)
  - `GITHUB_SYNC_TOKEN` (optional, recommended to avoid low rate limits)
- Apple Music:
  - `APPLE_MUSIC_DEVELOPER_TOKEN`
  - `APPLE_MUSIC_USER_TOKEN`
  - `APPLE_MUSIC_STOREFRONT` (default `us`)

## CI/CD

- Frontend CI: `.github/workflows/frontend-ci.yml`
  - `pnpm type-check`, `pnpm lint`, `pnpm test:layout`, `pnpm build`
- Backend CI: `.github/workflows/backend-ci.yml`
  - `cd backend && go test ./... && go build ./...`
- Publisher CI: `.github/workflows/publisher-ci.yml`
  - `pnpm -C publisher type-check`, `pnpm -C publisher lint`, `pnpm -C publisher build`
- Integration E2E (nightly/manual): `.github/workflows/integration-e2e.yml`
  - 启动 PostgreSQL + Next + Go API + worker，做端到端 smoke 验证。
- CD workflow: `.github/workflows/cd.yml`
  - Triggered after Frontend CI succeeds on `main` (or manual dispatch).
