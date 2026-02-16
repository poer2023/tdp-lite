import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { publishRequestSchema } from "@/lib/publish/contracts";
import { sha256Hex, verifyPublisherRequest } from "@/lib/publish/auth";
import {
  beginIdempotentPublish,
  discardIdempotentPublish,
  finalizeIdempotentPublish,
} from "@/lib/publish/idempotency";
import { publishByPayload } from "@/lib/publish/service";
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

  const validated = publishRequestSchema.safeParse(parsedBody);
  if (!validated.success) {
    return jsonError("invalid publish payload");
  }

  const payloadHash = sha256Hex(JSON.stringify(validated.data.payload));
  const idempotencyKey = validated.data.idempotencyKey?.trim();
  let idempotencyOwner = false;
  let didWriteContent = false;

  if (idempotencyKey) {
    const lock = await beginIdempotentPublish({
      key: idempotencyKey,
      requestHash: payloadHash,
    });

    if (lock.status === "existing") {
      if (lock.requestHash !== payloadHash) {
        return jsonError(
          "idempotency key already used with a different payload",
          409
        );
      }

      if (lock.result) {
        return NextResponse.json(lock.result);
      }

      return jsonError("idempotent request is in progress, retry shortly", 409);
    }

    idempotencyOwner = true;
  }

  try {
    const result = await publishByPayload(validated.data.payload);
    didWriteContent = true;
    const baseUrl = getAppBaseUrl(request);

    const responsePayload = {
      kind: result.kind,
      id: result.id,
      url: `${baseUrl}${result.url}`,
      publishedAt: result.publishedAt,
    };

    if (idempotencyKey) {
      await finalizeIdempotentPublish({
        key: idempotencyKey,
        requestHash: payloadHash,
        result: responsePayload,
      });
    }

    revalidatePath("/");
    revalidatePath(result.url);
    revalidatePath("/gallery");
    revalidatePath("/posts");
    revalidatePath("/moments");

    return NextResponse.json(responsePayload);
  } catch (error) {
    if (idempotencyKey && idempotencyOwner && !didWriteContent) {
      await discardIdempotentPublish({
        key: idempotencyKey,
        requestHash: payloadHash,
      });
    }

    const message = error instanceof Error ? error.message : "publish failed";
    return jsonError(message, 500);
  }
}
