import { NextResponse } from "next/server";
import { searchRequestSchema } from "@/lib/search/contracts";
import { searchBySectionInSnapshot } from "@/lib/search/searchSnapshot";

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
    const payload =
      parsed.data.section === "post"
        ? await searchBySectionInSnapshot({ ...parsed.data, section: "post" })
        : parsed.data.section === "moment"
          ? await searchBySectionInSnapshot({ ...parsed.data, section: "moment" })
          : await searchBySectionInSnapshot({ ...parsed.data, section: "gallery" });
    const response = NextResponse.json(payload);
    response.headers.set("x-tdp-search-source", "snapshot");
    response.headers.set("x-tdp-search-fallback", "false");
    return response;
  } catch (error) {
    console.error("Search API error:", error);
    const response = NextResponse.json(
      { error: "Search request failed." },
      { status: 500 }
    );
    response.headers.set("x-tdp-search-source", "snapshot");
    response.headers.set("x-tdp-search-fallback", "false");
    return response;
  }
}
