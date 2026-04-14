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

### Publishing

- The legacy in-repo `publisher/` service has been removed.
- Publishing is handled by the separate `tdp-slide` publish app.
- Lite runtime does not depend on any publisher process.

## Docker Compose（单仓库、双服务隔离）

1. 复制 compose 环境变量模板：
   - `cp docker/.env.compose.example .env.compose`
   - 必填强密钥：`NEXTAUTH_SECRET`、`TDP_PREVIEW_SECRET`、`TDP_INTERNAL_KEY_SECRET`
2. 启动 Lite 主链路：
   - `docker compose --env-file .env.compose up -d`
3. 若需要独立同步 GitHub / Apple Music / search snapshot，再启 sync profile：
   - `docker compose --env-file .env.compose --profile sync up -d profile-sync`

默认端口：

- Lite Web: `3000`
- Go API: `8080`

隔离保证：

- `lite-web` / `lite-api` / `lite-worker` 没有对发布后台的运行依赖。
- Compose 已启用 `lite-api` / `lite-web` 健康检查。
- `db` / `api` 默认仅绑定到 `127.0.0.1`（可通过 `*.BIND_HOST` 覆盖）。

## Coolify 发布（推荐）

目标：尽可能统一为 Coolify CLI/API 发布，减少手动操作。

1. 初始化配置：
   - `cp .env.coolify.example .env.coolify`
   - 按需修改 `COOLIFY_CONTEXT`、`COOLIFY_LITE_UUID`、`COOLIFY_API_APP_UUID`、健康检查 URL 等。
2. 发布 API（推荐先发 API）：
   - `pnpm deploy:coolify:api`
3. 发布 Lite：
   - `pnpm deploy:coolify:lite`
4. 发布全部目标（api + lite）：
   - `pnpm deploy:coolify:all`
5. 发布前预演：
   - `pnpm deploy:coolify:dry-run`
6. 发布前硬化检查（建议）：
   - `pnpm release:preflight`

脚本说明（`scripts/deploy-coolify.sh`）：

- 默认 `api` 模式：调用 `/api/v1/deploy?uuid=`，更利于保留构建缓存。
- 如需回退，可切换 `cli` 模式：`COOLIFY_DEPLOY_MODE=cli`（调用 `coolify deploy uuid`）。
- 支持按 UUID 或按名称自动发现应用。
- 支持 `api|lite|all` 多目标发布；`all` 会按 `api -> lite` 顺序执行。
- 支持等待部署完成、失败即退出、部署后健康检查。

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

## Snapshot Sync (GitHub + Apple Music + Search)

- Sync worker only writes snapshots:
  - profile: pull source data -> normalize -> `POST /v1/internal/profile-snapshot`
  - search: build locale index -> `POST /v1/internal/search-snapshot`
- Frontend (`tdp-lite`) only reads:
  - `GET /v1/public/profile-snapshot`
  - `GET /v1/public/search-snapshot`
- Failure isolation:
  - sync failure only affects data freshness, never blocks page rendering.
  - source partial failure preserves previous snapshot fields (no destructive overwrite).
  - search snapshot upsert failure preserves the previous successful search snapshot.
  - content writes only enqueue a search refresh request; the rebuild remains async and never blocks publish success.
  - profile sync also writes `data/profile-snapshot.json` locally by default; lite falls back to that file, then to in-process stale cache, when the profile snapshot API is unavailable.

Local run:

- One-shot sync:
  - `pnpm sync:once`
- Loop mode:
  - `pnpm sync:loop`
- Legacy single-task commands still work:
  - `pnpm profile:sync`
  - `pnpm profile:sync:loop`
  - `pnpm search:sync`

Optional env:

- `PROFILE_SYNC_WRITE_LOCAL=false`
  - disable writing `data/profile-snapshot.json`
- `PROFILE_SYNC_OUTPUT_FILE=/custom/path/profile-snapshot.json`
  - override the local profile snapshot output path
Required env:

- `TDP_INTERNAL_KEY_ID`, `TDP_INTERNAL_KEY_SECRET`
- GitHub:
  - `GITHUB_SYNC_USERNAME` (required for GitHub sync)
  - `GITHUB_SYNC_TOKEN` (optional, recommended to avoid low rate limits)
- Apple Music:
  - `APPLE_MUSIC_DEVELOPER_TOKEN`
  - `APPLE_MUSIC_USER_TOKEN`
  - `APPLE_MUSIC_STOREFRONT` (default `us`)
- Search sync:
  - `SEARCH_SYNC_INTERVAL_HOURS` (default `1` in compose sync profile)
  - `SEARCH_SYNC_WRITE_LOCAL` (`true` for local dev, `false` for isolated sync container)

## CI/CD

- Frontend CI: `.github/workflows/frontend-ci.yml`
  - `pnpm type-check`, `pnpm lint`, `pnpm test:layout`, `pnpm build`
- Backend CI: `.github/workflows/backend-ci.yml`
  - `cd backend && go test ./... && go build ./...`
- Integration E2E (nightly/manual): `.github/workflows/integration-e2e.yml`
  - 启动 PostgreSQL + Next + Go API + worker，做端到端 smoke 验证。
- CD workflow: `.github/workflows/cd.yml`
  - Triggered after Frontend CI succeeds on `main` (or manual dispatch).
