# UI Style Rules for TDP Lite

## 1. Design Philosophy
- **Style:** Modern, Minimalist, "Bento" Grid.
- **Keywords:** Clean, Organized, Adaptive, Content-First.
- **Vibe:** Personal dashboard, digital garden.

## 2. Grid System (Bento)
- **Base Grid:** CSS Grid with 4 columns on desktop (`grid-cols-4`), 2 on tablet (`md:grid-cols-2`), 1 on mobile (`grid-cols-1`).
- **Gap:** Consistent `gap-4` or `gap-6`.
- **Card Spans:**
  - **Standard:** 1x1 (Icon, Stat, Short Text).
  - **Wide:** 2x1 (Article Header, Banner).
  - **Tall:** 1x2 (Portrait Photo, List).
  - **Hero/Featured:** 2x2 (Major Moment, Featured Article).

## 3. Colors & Typography
- **Backgrounds:**
  - Page: `bg-background` (System default/white/black).
  - Cards: `bg-card` / `bg-white` (Light) / `bg-zinc-900` (Dark).
  - Subtle contrasts for card separation.
- **Typography:**
  - Headings: Bold, tight tracking.
  - Body: Readable, relaxed line height.
  - Details: Small, muted (`text-muted-foreground`).
- **Borders:**
  - Soft borders (`border-border` / `border-gray-200` dark: `border-gray-800`).
  - Rounded corners: `rounded-2xl` or `rounded-3xl` for that "app-like" feel.

## 4. Component States
- **Hover:** Subtle transform (`hover:scale-[1.02]`) or shadow increase.
- **Loading:** Skeleton loaders matching the bento shapes.

## 5. Visual Assets
- **Images:** `object-cover`, full rounded corners matching card.
- **Icons:** Lucide React, consistent size (usually 20px or 24px).
