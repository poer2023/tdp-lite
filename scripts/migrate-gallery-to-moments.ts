#!/usr/bin/env tsx

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

type CliOptions = {
  dryRun: boolean;
  help: boolean;
  locale: "en" | "zh" | null;
};

type GalleryRow = {
  id: string;
  translationKey: string;
  locale: string;
  fileUrl: string;
  thumbUrl: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
  capturedAt: Date | string | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  iso: number | null;
  latitude: number | null;
  longitude: number | null;
  isLivePhoto: boolean | null;
  videoUrl: string | null;
  status: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type MomentMediaItem = {
  type: "image" | "video";
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  title?: string;
  capturedAt?: string;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  iso?: number;
  latitude?: number;
  longitude?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    help: false,
    locale: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--locale") {
      const next = argv[index + 1];
      if (next === "en" || next === "zh") {
        options.locale = next;
        index += 1;
        continue;
      }
      throw new Error("--locale requires en or zh");
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log(`Migrate legacy gallery rows into moments media entries.

Usage:
  pnpm migrate:gallery-to-moments -- [--dry-run] [--locale en|zh]

Options:
  --dry-run   Print migration stats without writing data
  --locale    Only migrate one locale
  --help      Show this help
`);
}

function parseEnvFile(pathname: string): Record<string, string> {
  const absolutePath = resolve(pathname);
  if (!existsSync(absolutePath)) {
    return {};
  }

  const raw = readFileSync(absolutePath, "utf-8");
  const values: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    values[key] = value;
  }

  return values;
}

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  const envValues = {
    ...parseEnvFile(".env"),
    ...parseEnvFile(".env.local"),
  };

  const fromFiles = envValues.DATABASE_URL;
  if (fromFiles && fromFiles.trim()) {
    return fromFiles.trim();
  }

  throw new Error("DATABASE_URL is required (env, .env, or .env.local)");
}

function normalizeDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function asLocale(value: string): "en" | "zh" {
  return value === "zh" ? "zh" : "en";
}

function asStatus(value: string | null): string {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }
  return "published";
}

function asOptionalString(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isVideoAssetUrl(value: string): boolean {
  const normalized = value.toLowerCase();
  return /\.(mp4|m4v|mov|webm|ogg|ogv)(?:[?#].*)?$/.test(normalized);
}

function buildSharedMediaMetadata(
  row: GalleryRow
): Omit<MomentMediaItem, "type" | "url"> {
  const capturedAt = normalizeDate(row.capturedAt)?.toISOString();
  const title = asOptionalString(row.title);

  return {
    ...(typeof row.width === "number" ? { width: row.width } : {}),
    ...(typeof row.height === "number" ? { height: row.height } : {}),
    ...(title ? { title } : {}),
    ...(capturedAt ? { capturedAt } : {}),
    ...(row.camera ? { camera: row.camera } : {}),
    ...(row.lens ? { lens: row.lens } : {}),
    ...(row.focalLength ? { focalLength: row.focalLength } : {}),
    ...(row.aperture ? { aperture: row.aperture } : {}),
    ...(typeof row.iso === "number" ? { iso: row.iso } : {}),
    ...(typeof row.latitude === "number" ? { latitude: row.latitude } : {}),
    ...(typeof row.longitude === "number" ? { longitude: row.longitude } : {}),
  };
}

function buildMomentMedia(row: GalleryRow): MomentMediaItem[] {
  const fileUrl = row.fileUrl.trim();
  const thumbUrl = asOptionalString(row.thumbUrl);
  const videoUrl = asOptionalString(row.videoUrl);
  const sharedMetadata = buildSharedMediaMetadata(row);
  const primaryType: MomentMediaItem["type"] = isVideoAssetUrl(fileUrl)
    ? "video"
    : "image";

  const media: MomentMediaItem[] = [
    {
      type: primaryType,
      url: fileUrl,
      ...(thumbUrl && thumbUrl !== fileUrl ? { thumbnailUrl: thumbUrl } : {}),
      ...sharedMetadata,
    },
  ];

  if (videoUrl && videoUrl !== fileUrl) {
    media.push({
      type: "video",
      url: videoUrl,
      ...(thumbUrl ? { thumbnailUrl: thumbUrl } : { thumbnailUrl: fileUrl }),
      ...sharedMetadata,
    });
  }

  return media;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const databaseUrl = resolveDatabaseUrl();
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const rows = await sql<GalleryRow[]>`
      SELECT
        id::text AS id,
        translation_key::text AS "translationKey",
        locale,
        file_url AS "fileUrl",
        thumb_url AS "thumbUrl",
        title,
        width,
        height,
        captured_at AS "capturedAt",
        camera,
        lens,
        focal_length AS "focalLength",
        aperture,
        iso,
        latitude,
        longitude,
        COALESCE(is_live_photo, false) AS "isLivePhoto",
        video_url AS "videoUrl",
        status,
        published_at AS "publishedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM gallery
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC
    `;

    const scopedRows = options.locale
      ? rows.filter((row) => asLocale(row.locale) === options.locale)
      : rows;
    const invalidRows = scopedRows.filter(
      (row) => !row.fileUrl || !row.fileUrl.trim()
    );
    const candidates = scopedRows.filter(
      (row) => row.fileUrl && row.fileUrl.trim()
    );
    const rowsWithVideo = candidates.filter(
      (row) =>
        Boolean(asOptionalString(row.videoUrl)) || isVideoAssetUrl(row.fileUrl)
    );
    const rowsWithBlankContent = candidates.filter(
      (row) => !asOptionalString(row.title)
    );
    const livePhotoRows = candidates.filter((row) => Boolean(row.isLivePhoto));

    console.log("Gallery -> Moments migration stats:");
    if (options.locale) {
      console.log(`- locale filter: ${options.locale}`);
    }
    console.log(`- total visible gallery rows: ${scopedRows.length}`);
    console.log(`- valid candidates: ${candidates.length}`);
    console.log(`- invalid rows: ${invalidRows.length}`);
    console.log(`- rows with video/live photo media: ${rowsWithVideo.length}`);
    console.log(
      `- rows that will become media-only moments: ${rowsWithBlankContent.length}`
    );
    console.log(`- rows flagged as live photo: ${livePhotoRows.length}`);

    if (invalidRows.length > 0) {
      console.log(
        "Invalid row ids:",
        invalidRows.map((row) => row.id).join(", ")
      );
    }

    if (options.dryRun) {
      console.log("Dry run complete. No changes were written.");
      return;
    }

    if (candidates.length === 0) {
      console.log("No valid legacy gallery rows found. Nothing to migrate.");
      return;
    }

    let migratedCount = 0;
    let softDeletedCount = 0;
    let conflictCount = 0;
    const conflictIds: string[] = [];

    await sql.begin(async (tx) => {
      for (const row of candidates) {
        const media = buildMomentMedia(row);
        const content = row.title?.trim() ? row.title.trim() : "";
        const publishedAt = normalizeDate(row.publishedAt);
        const createdAt = normalizeDate(row.createdAt) ?? new Date();
        const updatedAt = normalizeDate(row.updatedAt) ?? createdAt;

        const insertedRows = await tx.unsafe<Array<{ id: string }>>(
          `INSERT INTO moments (
             translation_key,
             content,
             media,
             locale,
             visibility,
             status,
             published_at,
             created_at,
             updated_at
           )
           VALUES ($1::uuid, $2, $3::jsonb, $4, 'public', $5, $6, $7, $8)
           ON CONFLICT (translation_key, locale) DO NOTHING
           RETURNING id::text AS id`,
          [
            row.translationKey,
            content,
            JSON.stringify(media),
            asLocale(row.locale),
            asStatus(row.status),
            publishedAt,
            createdAt,
            updatedAt,
          ]
        );

        if (insertedRows.length === 0) {
          conflictCount += 1;
          conflictIds.push(row.id);
          continue;
        }

        migratedCount += 1;

        const updateResult = await tx.unsafe(
          `UPDATE gallery
           SET deleted_at = NOW(), updated_at = NOW()
           WHERE id = $1::uuid AND deleted_at IS NULL`,
          [row.id]
        );
        softDeletedCount += updateResult.count;
      }
    });

    console.log("Migration complete:");
    console.log(`- migrated to moments: ${migratedCount}`);
    console.log(`- soft-deleted gallery rows: ${softDeletedCount}`);
    console.log(
      `- skipped because matching moment already exists: ${conflictCount}`
    );

    if (conflictIds.length > 0) {
      console.log("Skipped gallery ids:", conflictIds.join(", "));
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
