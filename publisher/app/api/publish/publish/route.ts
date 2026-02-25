import { NextResponse } from "next/server";
import { publishRequestSchema } from "@/lib/contracts";
import { SiteClientError, publishToSite } from "@/lib/siteClient";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = publishRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid publish payload" }, { status: 400 });
    }

    const response = await publishToSite(parsed.data);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof SiteClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
