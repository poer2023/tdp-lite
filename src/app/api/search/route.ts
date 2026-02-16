import { NextResponse } from "next/server";
import type { SearchSection } from "@/lib/search/contracts";
import { searchRequestSchema } from "@/lib/search/contracts";
import { SearchDualSourceError, SearchSourceError } from "@/lib/search/errors";
import { routeSearchWithFallback } from "@/lib/search/searchRouter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = searchRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search request." }, { status: 400 });
  }

  try {
    const result = await routeSearchWithFallback<SearchSection>(parsed.data);
    const response = NextResponse.json(result.payload);
    response.headers.set("x-tdp-search-source", result.source);
    response.headers.set("x-tdp-search-fallback", result.fallback ? "true" : "false");
    return response;
  } catch (error) {
    if (error instanceof SearchDualSourceError) {
      console.error("Search dual-source failure", error);
      const response = NextResponse.json(
        { error: "Search service unavailable." },
        { status: 502 }
      );
      response.headers.set("x-tdp-search-source", "none");
      response.headers.set("x-tdp-search-fallback", "true");
      return response;
    }

    if (error instanceof SearchSourceError) {
      const status =
        typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 500
          ? error.statusCode
          : 502;
      const response = NextResponse.json(
        { error: error.message || "Search request failed." },
        { status }
      );
      response.headers.set("x-tdp-search-source", error.source);
      response.headers.set("x-tdp-search-fallback", "false");
      return response;
    }

    console.error("Search API error:", error);
    const response = NextResponse.json({ error: "Search request failed." }, { status: 500 });
    response.headers.set("x-tdp-search-source", "none");
    response.headers.set("x-tdp-search-fallback", "false");
    return response;
  }
}
