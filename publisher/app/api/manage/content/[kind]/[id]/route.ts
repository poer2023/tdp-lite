import { NextResponse } from "next/server";
import { requirePublisherApiAuth } from "@/lib/auth";
import { z } from "zod";
import {
  manageCardSpanUpdateSchema,
  manageContentKindSchema,
} from "@/lib/contracts";
import {
  SiteClientError,
  deleteMomentOnSite,
  deletePostOnSite,
  updateMomentCardSpanOnSite,
  updatePostCardSpanOnSite,
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
  const authError = await requirePublisherApiAuth();
  if (authError) {
    return authError;
  }

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

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await requirePublisherApiAuth();
  if (authError) {
    return authError;
  }

  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: "invalid management target" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsedBody = manageCardSpanUpdateSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "invalid card span payload" },
        { status: 400 }
      );
    }

    if (parsedParams.data.kind === "post") {
      const item = await updatePostCardSpanOnSite(
        parsedParams.data.id,
        parsedBody.data.cardSpan
      );
      return NextResponse.json({ item });
    }

    const item = await updateMomentCardSpanOnSite(
      parsedParams.data.id,
      parsedBody.data.cardSpan
    );
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof SiteClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message =
      error instanceof Error ? error.message : "card span update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
