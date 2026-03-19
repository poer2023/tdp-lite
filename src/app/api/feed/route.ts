import { NextRequest, NextResponse } from "next/server";
import { getPublicFeed } from "@/lib/content/read";
import { normalizeLocale } from "@/lib/locale";
import { PUBLIC_CACHE_REVALIDATE } from "@/lib/publicCache";
import { serializeFeedItem } from "@/lib/search/feedItemSnapshot";

const MAX_LIMIT = 100;

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest) {
  const locale = normalizeLocale(request.nextUrl.searchParams.get("locale") ?? "zh");
  const limit = parsePositiveInt(
    request.nextUrl.searchParams.get("limit"),
    24,
    MAX_LIMIT
  );
  const offset = parsePositiveInt(
    request.nextUrl.searchParams.get("offset"),
    0,
    limit
  );

  const items = (await getPublicFeed(locale, limit))
    .slice(offset)
    .map(serializeFeedItem)
    .filter((item) => item !== null);

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${PUBLIC_CACHE_REVALIDATE.feed}, stale-while-revalidate=${PUBLIC_CACHE_REVALIDATE.feed * 4}`,
      },
    }
  );
}
