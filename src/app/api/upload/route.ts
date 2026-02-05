import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/storage";
import { parseExif } from "@/lib/exif";

// POST /api/upload - Upload file (authenticated)
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request, "upload:write");
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing required field: file" },
        { status: 400 }
      );
    }

    // Get file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse EXIF if it's an image
    let exifData = null;
    if (file.type.startsWith("image/")) {
      exifData = await parseExif(buffer);
    }

    // Upload to R2
    const result = await uploadToR2(buffer, file.name, file.type);

    return NextResponse.json(
      {
        url: result.url,
        key: result.key,
        exif: exifData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
