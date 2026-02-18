# Liquid Glass Nav — iOS 26 Refraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current WebGL shader + frosted glass nav with a true iOS 26 Liquid Glass effect using SVG displacement maps for lensing/refraction.

**Architecture:** Apply `backdrop-filter: url("data:image/svg+xml...")` with a nested SVG displacement map to create pixel-level refraction. Three `feDisplacementMap` passes with slightly different scales produce chromatic aberration. A `ResizeObserver` regenerates the filter when the nav resizes. CSS handles specular highlights and the active-state pill.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, SVG filters, CSS `backdrop-filter`

---

## Background

### How the effect works

```
backdrop-filter: blur(20px) url("data:image/svg+xml,...#displace") saturate(1.6)
                                        ↑
                          Outer SVG — contains <filter id="displace">
                            ├── feImage → loads displacement map SVG (data URL)
                            ├── feDisplacementMap (scale=26) → R channel → isolate red
                            ├── feDisplacementMap (scale=24) → G channel → isolate green
                            ├── feDisplacementMap (scale=22) → B channel → isolate blue
                            └── feBlend screen × 2 → recombine RGB (chromatic aberration)

Displacement map SVG:
  base #808080 (neutral = no displacement)
  + X gradient (#F00→#000, screen blend) → horizontal lens
  + Y gradient (#0F0→#000, screen blend) → vertical lens
  + blurred inner rect #808080 → reduces displacement in center (lens shape)
```

### Browser support
- Chrome/Edge: full effect (backdrop-filter + url())
- Safari: falls back to `blur(20px) saturate(1.6)` only (no refraction, still looks good)
- Firefox: no backdrop-filter at all → opaque fallback via `@supports`

### What's changing vs current code
| | Before | After |
|---|---|---|
| Refraction | None | SVG displacement map |
| Shell opacity | 0.58 top / 0.34 bottom | ~0.08 (near-transparent) |
| WebGL canvas | Animated highlight overlay | Removed |
| Active pill | Dark gradient | Light glass pill |
| Chromatic aberration | None | ±2px R/G/B offset |

---

## Task 1: Create displacement map generator

**Files:**
- Create: `src/lib/liquid-glass.ts`

**Step 1: Create the file**

```typescript
// src/lib/liquid-glass.ts

/**
 * Builds the inner displacement map SVG.
 * - Base #808080 = neutral (no displacement)
 * - X gradient (screen blend): left=#F00 → right=#000 → horizontal lens
 * - Y gradient (screen blend): top=#0F0 → bottom=#000 → vertical lens
 * - Blurred inner rect reduces displacement in center, creating lens shape
 */
function buildDisplacementMapSvg(
  width: number,
  height: number,
  depth: number
): string {
  const pad = Math.round(depth);
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const blurR = Math.round(depth * 0.8);

  return (
    `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<style>.mix{mix-blend-mode:screen}</style>` +
    `<defs>` +
    `<linearGradient id="Y" x1="0" x2="0" y1="0%" y2="100%">` +
    `<stop offset="0%" stop-color="#0F0"/><stop offset="100%" stop-color="#000"/>` +
    `</linearGradient>` +
    `<linearGradient id="X" x1="0%" x2="100%" y1="0" y2="0">` +
    `<stop offset="0%" stop-color="#F00"/><stop offset="100%" stop-color="#000"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="0" y="0" height="${height}" width="${width}" fill="#808080"/>` +
    `<g filter="blur(2px)">` +
    `<rect x="0" y="0" height="${height}" width="${width}" fill="#000080"/>` +
    `<rect x="0" y="0" height="${height}" width="${width}" fill="url(#Y)" class="mix"/>` +
    `<rect x="0" y="0" height="${height}" width="${width}" fill="url(#X)" class="mix"/>` +
    `<rect x="${pad}" y="${pad}" height="${innerH}" width="${innerW}" ` +
    `fill="#808080" rx="${pad}" ry="${pad}" filter="blur(${blurR}px)"/>` +
    `</g>` +
    `</svg>`
  );
}

/**
 * Builds the outer SVG filter with 3-pass chromatic aberration.
 * R/G/B channels are displaced by (strength+cab), strength, (strength-cab)
 * then recombined with screen blend → iridescent edge fringing.
 */
function buildFilterSvg(
  width: number,
  height: number,
  strength: number,
  cab: number
): string {
  const depth = Math.round(strength * 0.4);
  const mapSvg = buildDisplacementMapSvg(width, height, depth);
  const mapUrl = `data:image/svg+xml;utf8,${encodeURIComponent(mapSvg)}`;
  const scaleR = strength + cab;
  const scaleG = strength;
  const scaleB = Math.max(0, strength - cab);

  return (
    `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<defs>` +
    `<filter id="displace" color-interpolation-filters="sRGB">` +
    `<feImage x="0" y="0" height="${height}" width="${width}" ` +
    `href="${mapUrl}" result="map"/>` +
    `<feDisplacementMap transform-origin="center" in="SourceGraphic" in2="map" ` +
    `scale="${scaleR}" xChannelSelector="R" yChannelSelector="G"/>` +
    `<feColorMatrix type="matrix" ` +
    `values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispR"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" ` +
    `scale="${scaleG}" xChannelSelector="R" yChannelSelector="G"/>` +
    `<feColorMatrix type="matrix" ` +
    `values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispG"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" ` +
    `scale="${scaleB}" xChannelSelector="R" yChannelSelector="G"/>` +
    `<feColorMatrix type="matrix" ` +
    `values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="dispB"/>` +
    `<feBlend in="dispR" in2="dispG" mode="screen"/>` +
    `<feBlend in2="dispB" mode="screen"/>` +
    `</filter>` +
    `</defs>` +
    `</svg>#displace`
  );
}

interface LiquidGlassOptions {
  /** Gaussian blur in px (default: 20) */
  blur?: number;
  /** Displacement scale in px (default: 24) */
  strength?: number;
  /** Chromatic aberration offset in px (default: 2) */
  cab?: number;
  /** CSS saturate value (default: 1.6) */
  saturate?: number;
  /** CSS brightness value (default: 1.05) */
  brightness?: number;
}

/**
 * Returns the full backdrop-filter CSS value for the liquid glass effect.
 * Falls back gracefully: if width/height are 0, returns plain blur.
 */
export function getLiquidGlassFilter(
  width: number,
  height: number,
  options: LiquidGlassOptions = {}
): string {
  const {
    blur = 20,
    strength = 24,
    cab = 2,
    saturate = 1.6,
    brightness = 1.05,
  } = options;

  const base = `blur(${blur}px) saturate(${saturate}) brightness(${brightness})`;
  if (width <= 0 || height <= 0) return base;

  const filterSvg = buildFilterSvg(width, height, strength, cab);
  const filterUrl = `data:image/svg+xml;utf8,${encodeURIComponent(filterSvg)}`;
  return `${base} url("${filterUrl}")`;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/liquid-glass.ts
git commit -m "feat(nav): add SVG displacement map generator for liquid glass"
```

---

## Task 2: Update `IconNavShell` — remove WebGL, apply displacement filter

**Files:**
- Modify: `src/components/ui/IconNav.tsx`

**Step 1: Replace the file content**

The file needs `"use client"` at the top (hooks are used). Replace the entire file:

```typescript
"use client";

import Link from "next/link";
import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getLiquidGlassFilter } from "@/lib/liquid-glass";

interface IconNavShellProps {
  children: React.ReactNode;
  className?: string;
}

export function IconNavShell({ children, className }: IconNavShellProps) {
  const navRef = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<string>(
    "blur(20px) saturate(1.6) brightness(1.05)"
  );

  const updateFilter = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setFilter(
        getLiquidGlassFilter(Math.round(rect.width), Math.round(rect.height))
      );
    }
  }, []);

  useEffect(() => {
    updateFilter();
    const observer = new ResizeObserver(updateFilter);
    if (navRef.current) observer.observe(navRef.current);
    return () => observer.disconnect();
  }, [updateFilter]);

  return (
    <nav
      ref={navRef}
      className={cn("liquid-nav-shell", className)}
      style={{
        backdropFilter: filter,
        WebkitBackdropFilter: filter,
      }}
    >
      <div className="liquid-nav-content">{children}</div>
    </nav>
  );
}

interface IconNavItemProps {
  icon: React.ReactNode;
  href?: string;
  label?: string;
  active?: boolean;
  emphasized?: boolean;
  textClassName?: string;
  tooltipTopClassName?: string;
  className?: string;
}

export function IconNavItem({
  icon,
  href,
  label,
  active = false,
  emphasized = false,
  textClassName,
  tooltipTopClassName = "-top-12",
  className,
}: IconNavItemProps) {
  const isHighlighted = active || emphasized;
  const baseClass = cn(
    "liquid-nav-item group relative flex h-11 w-11 items-center justify-center rounded-full",
    isHighlighted && "liquid-nav-item--active",
    emphasized && "liquid-nav-item--emphasized",
    !isHighlighted && textClassName,
    className
  );

  const content = (
    <>
      {icon}
      {label && !active && !emphasized ? (
        <span
          className={cn(
            "liquid-nav-tooltip pointer-events-none absolute whitespace-nowrap rounded px-2 py-1 font-mono text-[10px] text-white opacity-0",
            tooltipTopClassName
          )}
        >
          {label}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseClass} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={baseClass} aria-label={label}>
      {content}
    </button>
  );
}
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/ui/IconNav.tsx
git commit -m "feat(nav): replace WebGL shader with SVG displacement filter"
```

---

## Task 3: Update CSS variables — near-transparent shell

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace the liquid-nav CSS variables block**

Find and replace the 11 `--liquid-nav-*` variables in `:root`:

```css
/* Replace these: */
--liquid-nav-shell-top: rgba(255, 255, 255, 0.58);
--liquid-nav-shell-bottom: rgba(246, 248, 252, 0.34);
--liquid-nav-border: rgba(255, 255, 255, 0.72);
--liquid-nav-inner-border: rgba(255, 255, 255, 0.8);
--liquid-nav-shadow-soft: 0 22px 40px -26px rgba(5, 12, 24, 0.45);
--liquid-nav-shadow-core: 0 10px 24px -14px rgba(10, 16, 28, 0.4);
--liquid-nav-tooltip-bg: rgba(26, 30, 36, 0.78);
--liquid-nav-icon: rgba(84, 90, 101, 0.92);
--liquid-nav-icon-hover: rgba(50, 56, 66, 0.96);
--liquid-nav-active-top: rgba(37, 44, 55, 0.84);
--liquid-nav-active-bottom: rgba(10, 13, 18, 0.9);

/* With these: */
--liquid-nav-shell-top: rgba(255, 255, 255, 0.09);
--liquid-nav-shell-bottom: rgba(255, 255, 255, 0.05);
--liquid-nav-border: rgba(255, 255, 255, 0.50);
--liquid-nav-inner-border: rgba(255, 255, 255, 0.85);
--liquid-nav-shadow-soft: 0 24px 48px -20px rgba(5, 12, 24, 0.35);
--liquid-nav-shadow-core: 0 8px 20px -10px rgba(10, 16, 28, 0.28);
--liquid-nav-tooltip-bg: rgba(26, 30, 36, 0.78);
--liquid-nav-icon: rgba(60, 65, 75, 0.88);
--liquid-nav-icon-hover: rgba(30, 35, 45, 0.96);
--liquid-nav-active-bg: rgba(255, 255, 255, 0.82);
--liquid-nav-active-color: rgba(15, 15, 20, 0.92);
--liquid-nav-active-border: rgba(255, 255, 255, 0.95);
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(nav): update CSS variables for near-transparent liquid glass shell"
```

---

## Task 4: Update `.liquid-nav-shell` and `.liquid-nav-item--active` CSS rules

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Update `.liquid-nav-shell` — remove backdrop-filter**

Find `.liquid-nav-shell {` block and remove the `backdrop-filter` and `-webkit-backdrop-filter` lines (they're now applied via inline style). Also update the background:

```css
.liquid-nav-shell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  border: 1px solid var(--liquid-nav-border);
  padding: 0.5rem;
  background: linear-gradient(
    180deg,
    var(--liquid-nav-shell-top),
    var(--liquid-nav-shell-bottom)
  );
  box-shadow: var(--liquid-nav-shadow-soft), var(--liquid-nav-shadow-core);
  /* backdrop-filter applied via inline style in IconNavShell */
  overflow: hidden;
  isolation: isolate;
}
```

**Step 2: Update `.liquid-nav-item--active`**

Replace the existing `.liquid-nav-item--active` block:

```css
.liquid-nav-item--active {
  border: 1px solid var(--liquid-nav-active-border);
  background: var(--liquid-nav-active-bg);
  color: var(--liquid-nav-active-color);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 0 rgba(0, 0, 0, 0.06),
    0 2px 8px -2px rgba(0, 0, 0, 0.18);
}

.liquid-nav-item--active::before {
  opacity: 1;
  background: radial-gradient(
    circle at 40% 20%,
    rgba(255, 255, 255, 0.7),
    rgba(255, 255, 255, 0.0) 60%
  );
}

.liquid-nav-item--active svg {
  transform: translateY(-0.25px);
}
```

**Step 3: Update `@supports` fallback**

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .liquid-nav-shell {
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 14px 30px -18px rgba(10, 16, 28, 0.35);
  }
}
```

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(nav): update shell and active pill styles for iOS 26 look"
```

---

## Task 5: Add dark mode variables

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add dark mode liquid-nav vars**

Inside the existing `@media (prefers-color-scheme: dark)` `:root` block, add:

```css
--liquid-nav-shell-top: rgba(255, 255, 255, 0.07);
--liquid-nav-shell-bottom: rgba(255, 255, 255, 0.03);
--liquid-nav-border: rgba(255, 255, 255, 0.18);
--liquid-nav-inner-border: rgba(255, 255, 255, 0.25);
--liquid-nav-shadow-soft: 0 24px 48px -20px rgba(0, 0, 0, 0.6);
--liquid-nav-shadow-core: 0 8px 20px -10px rgba(0, 0, 0, 0.5);
--liquid-nav-icon: rgba(200, 205, 215, 0.75);
--liquid-nav-icon-hover: rgba(230, 235, 245, 0.95);
--liquid-nav-active-bg: rgba(30, 32, 38, 0.88);
--liquid-nav-active-color: rgba(240, 242, 255, 0.95);
--liquid-nav-active-border: rgba(255, 255, 255, 0.18);
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(nav): add dark mode variables for liquid glass"
```

---

## Task 6: Remove `LiquidGlassShaderCanvas` (cleanup)

**Files:**
- Delete: `src/components/ui/LiquidGlassShaderCanvas.tsx`

**Step 1: Verify no other usages**

```bash
grep -r "LiquidGlassShaderCanvas" src/
```
Expected: zero results

**Step 2: Delete the file**

```bash
rm src/components/ui/LiquidGlassShaderCanvas.tsx
```

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(nav): remove unused LiquidGlassShaderCanvas WebGL component"
```

---

## Task 7: Visual verification & tuning

**Step 1: Start dev server (run manually in terminal)**

```bash
npm run dev
```

Open `http://localhost:3000` in Chrome/Edge and check:
- [ ] Nav bar is near-transparent (page content visible through it)
- [ ] Background content appears slightly distorted/refracted (Chrome/Edge only)
- [ ] Active tab has a light glass pill with dark icon
- [ ] Hover tooltip still works
- [ ] No console errors

**Step 2: Test in Safari**

Should fall back to frosted blur — still looks good, just no refraction.

**Step 3: Tune if needed**

In `src/components/ui/IconNav.tsx`, the `getLiquidGlassFilter` call uses defaults. To adjust:

```typescript
// More dramatic refraction:
getLiquidGlassFilter(w, h, { strength: 32, cab: 3 })

// Subtler:
getLiquidGlassFilter(w, h, { strength: 16, cab: 1 })
```

---

## Summary

| File | Action |
|------|--------|
| `src/lib/liquid-glass.ts` | Create — SVG filter generator |
| `src/components/ui/IconNav.tsx` | Modify — remove WebGL, add ResizeObserver + inline filter |
| `src/app/globals.css` | Modify — CSS vars, shell opacity, active pill style, dark mode |
| `src/components/ui/LiquidGlassShaderCanvas.tsx` | Delete |
