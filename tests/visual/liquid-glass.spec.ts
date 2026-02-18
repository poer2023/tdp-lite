import { expect, test, type Page } from "@playwright/test";

interface RouteCase {
  id: string;
  path: string;
}

const staticRoutes: RouteCase[] = [
  { id: "home", path: "/en" },
  { id: "about", path: "/en/about" },
  { id: "search", path: "/en/search" },
  { id: "gallery", path: "/en/gallery" },
];

function withQuery(path: string, query: string): string {
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}

async function resolveMomentDetailPath(page: Page): Promise<string> {
  await page.goto("/en/moments", { waitUntil: "networkidle" });
  await page.waitForSelector('a[href^="/en/moments/"]', { timeout: 20_000 });

  const href = await page
    .locator('a[href^="/en/moments/"]')
    .first()
    .getAttribute("href");

  if (!href) {
    throw new Error("Failed to resolve a moment detail route for visual regression.");
  }

  return href;
}

for (const route of staticRoutes) {
  test(`liquid glass regression ${route.path}`, async ({ page }) => {
    await page.goto(withQuery(route.path, "lg=off"), {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1400);
    await expect(page).toHaveScreenshot(`liquid-glass-${route.id}-off.png`, {
      fullPage: true,
    });

    await page.goto(withQuery(route.path, "lg-force=1"), {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1600);
    await expect(page).toHaveScreenshot(`liquid-glass-${route.id}-force.png`, {
      fullPage: true,
    });
  });
}

test("liquid glass regression /en/moments/[id]", async ({ page }) => {
  const momentPath = await resolveMomentDetailPath(page);

  await page.goto(withQuery(momentPath, "lg=off"), { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  await expect(page).toHaveScreenshot("liquid-glass-moment-off.png", {
    fullPage: true,
  });

  await page.goto(withQuery(momentPath, "lg-force=1"), {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1600);
  await expect(page).toHaveScreenshot("liquid-glass-moment-force.png", {
    fullPage: true,
  });
});
