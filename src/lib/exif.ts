import exifr from "exifr";

export interface ExifData {
  capturedAt?: Date;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  iso?: number;
  latitude?: number;
  longitude?: number;
  width?: number;
  height?: number;
}

/**
 * Parse EXIF data from image buffer
 */
export async function parseExif(buffer: Buffer): Promise<ExifData | null> {
  try {
    const exif = await exifr.parse(buffer, {
      pick: [
        "DateTimeOriginal",
        "Make",
        "Model",
        "LensModel",
        "FocalLength",
        "FNumber",
        "ISO",
        "GPSLatitude",
        "GPSLongitude",
        "ImageWidth",
        "ImageHeight",
        "ExifImageWidth",
        "ExifImageHeight",
      ],
      gps: true,
    });

    if (!exif) return null;

    const camera = [exif.Make, exif.Model].filter(Boolean).join(" ").trim();

    return {
      capturedAt: exif.DateTimeOriginal
        ? new Date(exif.DateTimeOriginal)
        : undefined,
      camera: camera || undefined,
      lens: exif.LensModel || undefined,
      focalLength: exif.FocalLength ? `${exif.FocalLength}mm` : undefined,
      aperture: exif.FNumber ? `f/${exif.FNumber}` : undefined,
      iso: exif.ISO || undefined,
      latitude: exif.latitude || undefined,
      longitude: exif.longitude || undefined,
      width: exif.ExifImageWidth || exif.ImageWidth || undefined,
      height: exif.ExifImageHeight || exif.ImageHeight || undefined,
    };
  } catch (error) {
    console.error("Failed to parse EXIF:", error);
    return null;
  }
}
