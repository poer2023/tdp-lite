import { NextResponse } from "next/server";
import { requirePublisherApiAuth } from "@/lib/auth";
import { z } from "zod";
import {
  manageContentKindSchema,
  manageContentStatusSchema,
} from "@/lib/contracts";
import {
  SiteClientError,
  listMomentsOnSite,
  listPostsOnSite,
} from "@/lib/siteClient";

export const runtime = "nodejs";

const querySchema = z.object({
  kind: manageContentKindSchema.default("moment"),
  status: manageContentStatusSchema.default("all"),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export async function GET(request: Request) {
  const authError = await requirePublisherApiAuth();
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      kind: url.searchParams.get("kind") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid management query" },
        { status: 400 }
      );
    }

    if (parsed.data.kind === "post") {
      const response = await listPostsOnSite({
        locale: "zh",
        status: parsed.data.status,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });
      return NextResponse.json(response);
    }

    const response = await listMomentsOnSite({
      locale: "zh",
      status: parsed.data.status,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof SiteClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message =
      error instanceof Error ? error.message : "management list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
