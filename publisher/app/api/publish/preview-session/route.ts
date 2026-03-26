import { NextResponse } from "next/server";
import { requirePublisherApiAuth } from "@/lib/auth";
import { previewSessionRequestSchema } from "@/lib/contracts";
import { SiteClientError, createPreviewSessionOnSite } from "@/lib/siteClient";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = await requirePublisherApiAuth();
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const parsed = previewSessionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid preview session payload" },
        { status: 400 }
      );
    }

    const response = await createPreviewSessionOnSite(parsed.data);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof SiteClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message =
      error instanceof Error ? error.message : "preview session creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
