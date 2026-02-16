import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/r2";
import { validateMediaUpload } from "@/lib/publish/mediaLimits";
import { sha256Hex, verifyPublisherRequest } from "@/lib/publish/auth";

export const dynamic = "force-dynamic";

function badRequest(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  const timestamp = request.headers.get("x-publisher-ts") || "";

  const bytes = new Uint8Array(await request.arrayBuffer());
  const bodyHash = sha256Hex(bytes);
  const verification = verifyPublisherRequest(request.headers, {
    method: "POST",
    path,
    timestamp,
    bodyHash,
  });

  if (!verification.ok) {
    return badRequest(verification.reason, 401);
  }

  const encodedFilename = request.headers.get("x-file-name");
  const rawMime = request.headers.get("x-file-type") || request.headers.get("content-type") || "";
  const mimeType = rawMime.split(";")[0]?.trim().toLowerCase() || "";

  if (!encodedFilename) {
    return badRequest("x-file-name is required");
  }
  if (bytes.byteLength === 0) {
    return badRequest("file payload is empty");
  }

  let filename = "";
  try {
    filename = decodeURIComponent(encodedFilename);
  } catch {
    filename = encodedFilename;
  }

  try {
    const { kind } = validateMediaUpload({
      filename,
      mimeType,
      size: bytes.byteLength,
    });

    const url = await uploadImage(Buffer.from(bytes), filename);
    return NextResponse.json({
      url,
      mimeType,
      size: bytes.byteLength,
      kind,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "media upload validation failed";
    return badRequest(message);
  }
}
