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

## CI/CD

- Frontend CI: `.github/workflows/frontend-ci.yml`
  - `pnpm type-check`, `pnpm lint`, `pnpm test:layout`, `pnpm build`
- Backend CI: `.github/workflows/backend-ci.yml`
  - `cd backend && go test ./... && go build ./...`
- Integration E2E (nightly/manual): `.github/workflows/integration-e2e.yml`
  - 启动 PostgreSQL + Next + Go API + worker，做端到端 smoke 验证。
- CD workflow: `.github/workflows/cd.yml`
  - Triggered after Frontend CI succeeds on `main` (or manual dispatch).
