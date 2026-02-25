import { NextResponse } from "next/server";
import { SiteClientError, uploadMediaToSite } from "@/lib/siteClient";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const result = await uploadMediaToSite({
      fileBytes,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SiteClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "media upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
