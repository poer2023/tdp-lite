# Component Directory

Updated: 2026-02-19

This directory maps UI routes to their page/component files so you can quickly find where to modify styles and behavior.

## Directly Viewable Routes (with screenshots)

| Route | Page file | Main components | Screenshot |
| --- | --- | --- | --- |
| `/zh` | `src/app/[locale]/page.tsx` | `BentoGrid`, `BottomNav`, `PostCard`, `MomentCard`, `GalleryCard`, `ActionCard` | [`zh-home.png`](./screenshots/zh-home.png) |
| `/zh/about` | `src/app/[locale]/about/page.tsx` | `BottomNav` + about sections (tech/activity/connectivity cards) | [`zh-about.png`](./screenshots/zh-about.png) |
| `/zh/gallery` | `src/app/[locale]/gallery/page.tsx` | `GalleryPageClient`, `BottomNav` | [`zh-gallery.png`](./screenshots/zh-gallery.png) |
| `/zh/moments` | `src/app/[locale]/moments/page.tsx` | Moments list page (links to detail page) | [`zh-moments.png`](./screenshots/zh-moments.png) |
| `/zh/posts` | `src/app/[locale]/posts/page.tsx` | Posts list page (links to detail page) | [`zh-posts.png`](./screenshots/zh-posts.png) |
| `/zh/search` | `src/app/[locale]/search/page.tsx` | `SearchPageClient`, `BottomNav` | [`zh-search.png`](./screenshots/zh-search.png) |
| `/admin/login` | `src/app/admin/login/page.tsx` | Admin login card | [`admin-login.png`](./screenshots/admin-login.png) |
| `/test/moment-detail` | `src/app/test/moment-detail/page.tsx` | `MomentDetailCard` (legacy media detail card) | [`test-moment-detail.png`](./screenshots/test-moment-detail.png) |
| `/test/text-moment-detail` | `src/app/test/text-moment-detail/page.tsx` | `TextMomentDetailCard` (legacy text detail card) | [`test-text-moment-detail.png`](./screenshots/test-text-moment-detail.png) |
| `/test/stitch-details` | `src/app/test/stitch-details/page.tsx` | `ArticlePaperDetail`, `GalleryMomentDetail`, `MusicMomentDetail`, `TextMomentPaperDetail` | [`test-stitch-details.png`](./screenshots/test-stitch-details.png) |

## Parameterized / Data-dependent Routes

| Route | Page file | Main components | Notes |
| --- | --- | --- | --- |
| `/[locale]/moments/[id]` | `src/app/[locale]/moments/[id]/page.tsx` | `MomentDetailCard`, `TextMomentDetailCard` | Production moment detail page (needs valid `id`) |
| `/[locale]/posts/[slug]` | `src/app/[locale]/posts/[slug]/page.tsx` | `ArticlePaperDetail` | Needs valid post `slug` |
| `/[locale]/gallery/[imageId]` | `src/app/[locale]/gallery/[imageId]/page.tsx` | `GalleryImageDetail` | Needs valid `imageId` |
| `/preview/card` | `src/app/preview/card/page.tsx` | `PostCard`, `MomentCard`, `GalleryCard` | Needs preview query payload |
| `/preview/detail` | `src/app/preview/detail/page.tsx` | `ArticlePaperDetail`, `GalleryMomentDetail`, `MomentDetailCard`, `TextMomentDetailCard` | Needs preview query payload |
| `/admin` | `src/app/admin/page.tsx` | (redirect gate) | Redirects to `/admin/login` or publisher URL |

## Legacy Moment Detail Card (quick reference)

If you want to check the old modal/detail-card style directly:

1. Media detail card: `/test/moment-detail` -> `src/components/bento/cards/MomentDetailCard.tsx`
2. Text detail card: `/test/text-moment-detail` -> `src/components/bento/cards/TextMomentDetailCard.tsx`
3. Production detail route: `/[locale]/moments/[id]` -> uses the same two cards based on whether media exists

## Refresh screenshots

```bash
./component-directory/capture-screenshots.sh http://localhost:3000
```

Requirements:
- local app is running
- `agent-browser` command is available
