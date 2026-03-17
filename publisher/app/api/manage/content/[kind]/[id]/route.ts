import { NextResponse } from "next/server";
import { z } from "zod";
import { manageContentKindSchema } from "@/lib/contracts";
import {
  SiteClientError,
  deleteMomentOnSite,
  deletePostOnSite,
} from "@/lib/siteClient";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ kind: string; id: string }>;
};

const paramsSchema = z.object({
  kind: manageContentKindSchema,
  id: z.string().trim().min(1),
});

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const parsed = paramsSchema.safeParse(await params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid management target" },
        { status: 400 }
      );
    }

    if (parsed.data.kind === "post") {
      const response = await deletePostOnSite(parsed.data.id);
      return NextResponse.json(response);
    }

    const response = await deleteMomentOnSite(parsed.data.id);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof SiteClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
