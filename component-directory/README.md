# Component Directory

Updated: 2026-02-19

This directory maps UI routes to their page/component files so you can quickly find where to modify styles and behavior.

## Locale Data Note

Routes are correct. This project currently has much richer seed/demo data in `en` than `zh`.
So list pages such as `/zh/moments`, `/zh/posts`, `/zh/gallery` may appear "empty" while the same `en` routes are populated.

## Directly Viewable Routes (with screenshots)

| Route | Page file | Main components | Screenshot |
| --- | --- | --- | --- |
| `/en` | `src/app/[locale]/page.tsx` | `BentoGrid`, `BottomNav`, `PostCard`, `MomentCard`, `GalleryCard`, `ActionCard` | [`en-home.png`](./screenshots/en-home.png) |
| `/en/gallery` | `src/app/[locale]/gallery/page.tsx` | `GalleryPageClient`, `BottomNav` | [`en-gallery.png`](./screenshots/en-gallery.png) |
| `/en/moments` | `src/app/[locale]/moments/page.tsx` | Moments list page (links to detail page) | [`en-moments.png`](./screenshots/en-moments.png) |
| `/en/posts` | `src/app/[locale]/posts/page.tsx` | Posts list page (links to detail page) | [`en-posts.png`](./screenshots/en-posts.png) |
| `/zh` | `src/app/[locale]/page.tsx` | `BentoGrid`, `BottomNav`, `PostCard`, `MomentCard`, `GalleryCard`, `ActionCard` | [`zh-home.png`](./screenshots/zh-home.png) |
| `/zh/about` | `src/app/[locale]/about/page.tsx` | `BottomNav` + about sections (tech/activity/connectivity cards) | [`zh-about.png`](./screenshots/zh-about.png) |
| `/zh/gallery` | `src/app/[locale]/gallery/page.tsx` | `GalleryPageClient`, `BottomNav` | [`zh-gallery.png`](./screenshots/zh-gallery.png) (currently mostly empty) |
| `/zh/moments` | `src/app/[locale]/moments/page.tsx` | Moments list page (links to detail page) | [`zh-moments.png`](./screenshots/zh-moments.png) (currently mostly empty) |
| `/zh/posts` | `src/app/[locale]/posts/page.tsx` | Posts list page (links to detail page) | [`zh-posts.png`](./screenshots/zh-posts.png) (currently mostly empty) |
| `/zh/search` | `src/app/[locale]/search/page.tsx` | `SearchPageClient`, `BottomNav` | [`zh-search.png`](./screenshots/zh-search.png) |
| `/admin/login` | `src/app/admin/login/page.tsx` | Admin login card | [`admin-login.png`](./screenshots/admin-login.png) |
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

Test routes for the two legacy detail cards were removed.
Use these routes/components instead:

1. Production detail route: `/[locale]/moments/[id]` -> `src/components/bento/cards/MomentDetailCard.tsx` / `src/components/bento/cards/TextMomentDetailCard.tsx`
2. Preview detail route: `/preview/detail` (requires preview token params)

## Refresh screenshots

```bash
./component-directory/capture-screenshots.sh http://localhost:3000
```

Requirements:
- local app is running
- `agent-browser` command is available
