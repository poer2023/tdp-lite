import { NextResponse } from "next/server";
import { z } from "zod";
import { manageContentKindSchema } from "@/lib/contracts";
import {
  SiteClientError,
  unpublishMomentOnSite,
  unpublishPostOnSite,
} from "@/lib/siteClient";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ kind: string; id: string }>;
};

const paramsSchema = z.object({
  kind: manageContentKindSchema,
  id: z.string().trim().min(1),
});

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const parsed = paramsSchema.safeParse(await params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid management target" },
        { status: 400 }
      );
    }

    if (parsed.data.kind === "post") {
      const response = await unpublishPostOnSite(parsed.data.id);
      return NextResponse.json({ item: response });
    }

    const response = await unpublishMomentOnSite(parsed.data.id);
    return NextResponse.json({ item: response });
  } catch (error) {
    if (error instanceof SiteClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "unpublish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
