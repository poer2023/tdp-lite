import { NextResponse } from "next/server";
import { previewSessionRequestSchema } from "@/lib/publish/contracts";
import { sha256Hex, verifyPublisherRequest } from "@/lib/publish/auth";
import { upsertPreviewSession } from "@/lib/publish/previewSession";
import { signPreviewAccess } from "@/lib/publish/previewToken";
import { getAppBaseUrl } from "@/lib/publish/url";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-publisher-ts") || "";
  const bodyHash = sha256Hex(rawBody);

  const verification = verifyPublisherRequest(request.headers, {
    method: "POST",
    path,
    timestamp,
    bodyHash,
  });
  if (!verification.ok) {
    return jsonError(verification.reason, 401);
  }

  let parsedBody: unknown;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return jsonError("request body must be valid JSON");
  }

  const validated = previewSessionRequestSchema.safeParse(parsedBody);
  if (!validated.success) {
    return jsonError("invalid preview session payload");
  }

  const session = await upsertPreviewSession({
    sessionId: validated.data.sessionId,
    payload: validated.data.payload,
  });

  const expiresAtMs = session.expiresAt.getTime();
  const signature = signPreviewAccess(session.id, expiresAtMs);
  const baseUrl = getAppBaseUrl(request);

  const query = new URLSearchParams({
    sid: session.id,
    exp: String(expiresAtMs),
    sig: signature,
  });

  return NextResponse.json({
    sessionId: session.id,
    expiresAt: session.expiresAt.toISOString(),
    cardPreviewUrl: `${baseUrl}/preview/card?${query.toString()}`,
    detailPreviewUrl: `${baseUrl}/preview/detail?${query.toString()}`,
  });
}
