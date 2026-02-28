# TDP Lite 2026 Hardening Roadmap

Updated: 2026-02-28
Status: Phase 2 complete, Phase 3 in progress

## Goal

- Public pages should stay lightweight and cacheable.
- Publisher, sync, and search failures must not block `tdp-lite`.
- `tdp-lite` should degrade gracefully and keep rendering from the last good data source.

## Active Workstreams

### 1. Public Page Caching

- Remove `force-dynamic` from public content routes.
- Keep cache policy at the data-fetch layer, not at the page shell.
- Add cache tags for feed, posts, moments, gallery, presence, and profile snapshot.
- Revalidate those tags on content mutations.

### 2. Search Snapshot Index

- Replace Go-primary live search with snapshot-based search documents.
- Build locale-specific index snapshots from published content.
- Keep old index when sync fails.

### 3. Lite Runtime Boundary

- Keep DB/Auth/Storage/Publisher concerns out of the public read path.
- Mark server-only modules explicitly.
- Move write-time concerns behind publisher/admin/sync boundaries.

### 4. Snapshot-Based External Data

- GitHub and Apple Music should sync into snapshots.
- `tdp-lite` should read only the latest successful snapshot.
- Sync failure may reduce freshness but must not break rendering.

### 5. CSS and Design Tokens

- Reduce `globals.css` to true global styles only.
- Tokenize shadow, glass, and card primitives.
- Remove long-term dependence on `.dark ... !important` overrides.

## Execution Order

1. Public page caching
2. Search snapshot index
3. Lite runtime boundary
4. External profile snapshots
5. CSS and dark-mode cleanup

## Phase 1 Scope

- Add `publicCache` tag helpers
- Route public fetches through tag-aware caching
- Remove `force-dynamic` from public pages
- Revalidate tags from admin create/delete actions

## 2026-02-28 Progress

### Completed in this pass

- Added `src/lib/publicCache.ts` to centralize revalidate windows and public cache tags.
- Moved public content caching to the fetch layer in `src/lib/publicApi.ts`.
- Removed `force-dynamic` from public list pages, home, search, about, and locale wrappers.
- Removed the root layout `headers()` dependency that was forcing the whole app tree dynamic.
- Wrapped `BottomNav` with `Suspense` so static prerendering no longer fails on `useSearchParams`.
- Hooked admin create/delete actions into `revalidateTag`.

### Verified

- `pnpm type-check` passes.
- `pnpm build` passes.
- Public routes now render as `○` or `●` in the build summary instead of being forced dynamic.

### Remaining inside Phase 1

- Detail routes such as `/posts/[slug]`, `/moments/[id]`, and `/gallery/[imageId]` are still on-demand dynamic because they do not yet provide static params or a snapshot-backed path manifest.
- Build-time logs still show degraded public API reads when the backend is offline; this does not fail the build, but snapshot-backed reads are still the cleaner end state.

## 2026-02-28 Search Snapshot Progress

### Completed in this pass

- Added `src/lib/search/searchSnapshot.ts` for snapshot-backed search reads.
- Replaced `/api/search` live Go/Next routing with local snapshot search.
- Added `scripts/search-sync.ts` and `pnpm search:sync`.
- Seeded `data/search-index/en.json` and `data/search-index/zh.json`, then generated real snapshots from the running public API.
- Added snapshot unit coverage in `src/lib/search/__tests__/searchSnapshot.test.ts`.
- Marked DB/Auth/R2/Publish/Search server modules with `server-only`.
- Added `src/lib/search/feedItemSnapshot.ts` so every search hit can carry a serializable card payload.
- Removed client-side post/moment/gallery hydration from `SearchPageClient`; search results now render directly from snapshot payloads.
- Regenerated locale search snapshots with embedded `feedItem` data and revalidated the production build.
- Added persisted search snapshot storage in backend (`search_snapshots`) with public/internal API endpoints.
- Updated `scripts/search-sync.ts` to upsert snapshots into API/DB while optionally keeping local files for dev.
- Added `scripts/sync-runner.mjs` and `pnpm sync:once` / `pnpm sync:loop` so profile + search sync run in one isolated process.
- Updated the compose `profile-sync` service to run the combined sync runner instead of only profile sync.
- Added remote search snapshot fallback in `src/lib/search/searchSnapshot.ts`, with stale in-memory fallback if the API read fails.
- Added `search_snapshot_refresh_state` so content mutations can request async search rebuild without blocking publish success.
- Verified the refresh request flow end-to-end: pending flag set -> sync runner wakes early -> search snapshot rebuilt -> pending cleared.

### Remaining after this pass

- Search snapshot rebuild is now requested immediately after content writes and consumed by the isolated sync runner; it is still eventual, not inline blocking.

## 2026-02-28 Detail Route Staticization

### Completed in this pass

- Added snapshot-backed route param helpers in `src/lib/detailRouteParams.ts`.
- Added snapshot read fallbacks in `src/lib/content/read.ts` so build-time content reads degrade to search snapshot data when the public API is unavailable.
- Added `generateStaticParams()` to locale and default detail routes for posts, moments, and gallery.
- Verified `pnpm build` now renders `/posts/[slug]`, `/moments/[id]`, and `/gallery/[imageId]` as `●` SSG routes.
- Added `scripts/check-architecture.mjs` and `pnpm check:architecture` to prevent public app files from reintroducing `force-dynamic`.
- Wired the architecture guardrail into `.github/workflows/frontend-ci.yml`.
- Split public content domain types into `src/lib/content/types.ts` so public UI/search/read modules no longer import `src/lib/schema.ts`.
- Extended the architecture guardrail so public runtime modules now fail CI if they import DB/Auth/Storage/Publish modules or `schema.ts`.

### Remaining after this pass

- Continue Phase 3 by reducing how much public runtime code depends on DB/Auth/Storage/Publisher packages still present in the lite workspace.
- Consider package/workspace extraction once the public read path is fully decoupled from write-time modules.

## Deferred

- Full search snapshot pipeline
- Package/workspace split
- Dark mode variable cleanup
- Global CSS decomposition

## 2026-02-28 Profile Snapshot Fallback

### Completed in this pass

- Updated `scripts/profile-sync.mjs` so profile sync writes the merged API response to a local `data/profile-snapshot.json` file by default.
- Added local-file and stale in-memory fallback to `fetchPublicProfileSnapshot()` in `src/lib/publicApi.ts`.
- Added a focused regression test in `src/lib/__tests__/publicApi.profileSnapshot.test.ts` to verify local snapshot fallback when the public API is unavailable.
- Added `vitest.config.ts` with the `@ -> src` alias so future unit tests can import runtime modules consistently.
- Expanded `/about` so more cards consume profile snapshot data: latest GitHub push, derived ratios, GitHub pulse metrics, and Apple Music top artists.

### Remaining after this pass

- If profile snapshot reading later needs cross-instance durability without shared volume, keep the API/DB path as primary and treat local snapshot only as a same-node fallback.

## 2026-02-28 CSS Cleanup

### Completed in this pass

- Moved `/about` page-specific styles from `src/app/globals.css` into `src/app/[locale]/about/about.module.css`.
- Removed the old global `about-*` utility block from `globals.css`.
- Verified `pnpm type-check` and `pnpm build` still pass after the style extraction.
- Reduced `src/app/globals.css` from 1120 lines to 1048 lines.
- Moved `/search` page-specific styles from `src/app/globals.css` into `src/components/search/search-page.module.css`.
- Removed the old global `search-stitch-*` style block from `globals.css`.
- Updated `SearchPageClient`, `SearchInput`, `SearchFilters`, and `SearchSectionList` to use local module classes plus token-friendly / explicit dark classes instead of relying on broad global dark overrides.
- Revalidated `/search` visually in both `en` and `zh` after the extraction.
- Reduced `src/app/globals.css` further from 1048 lines to 959 lines.

### Remaining after this pass

- Replace the broad `.dark ... !important` compatibility layer with token-driven styling where feasible.
- Continue extracting other page/domain-specific style blocks from `globals.css`.
