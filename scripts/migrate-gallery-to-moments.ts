#!/usr/bin/env tsx

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

type CliOptions = {
  dryRun: boolean;
  help: boolean;
};

type GalleryRow = {
  id: string;
  locale: string;
  fileUrl: string;
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
  status: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
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
  pnpm migrate:gallery-to-moments -- [--dry-run]

Options:
  --dry-run   Print migration stats without writing data
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
        locale,
        file_url AS "fileUrl",
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
        status,
        published_at AS "publishedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM gallery
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC
    `;

    const invalidRows = rows.filter((row) => !row.fileUrl || !row.fileUrl.trim());
    const candidates = rows.filter((row) => row.fileUrl && row.fileUrl.trim());

    console.log("Gallery -> Moments migration stats:");
    console.log(`- total visible gallery rows: ${rows.length}`);
    console.log(`- valid candidates: ${candidates.length}`);
    console.log(`- invalid rows: ${invalidRows.length}`);

    if (invalidRows.length > 0) {
      console.log("Invalid row ids:", invalidRows.map((row) => row.id).join(", "));
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

    await sql.begin(async (tx) => {
      for (const row of candidates) {
        const capturedAt = normalizeDate(row.capturedAt);
        const media = [
          {
            type: "image",
            url: row.fileUrl.trim(),
            ...(typeof row.width === "number" ? { width: row.width } : {}),
            ...(typeof row.height === "number" ? { height: row.height } : {}),
            ...(capturedAt ? { capturedAt: capturedAt.toISOString() } : {}),
            ...(row.camera ? { camera: row.camera } : {}),
            ...(row.lens ? { lens: row.lens } : {}),
            ...(row.focalLength ? { focalLength: row.focalLength } : {}),
            ...(row.aperture ? { aperture: row.aperture } : {}),
            ...(typeof row.iso === "number" ? { iso: row.iso } : {}),
            ...(typeof row.latitude === "number" ? { latitude: row.latitude } : {}),
            ...(typeof row.longitude === "number" ? { longitude: row.longitude } : {}),
          },
        ];

        const content = row.title?.trim() ? row.title.trim() : "Legacy photo";
        const publishedAt = normalizeDate(row.publishedAt);
        const createdAt = normalizeDate(row.createdAt) ?? new Date();
        const updatedAt = normalizeDate(row.updatedAt) ?? createdAt;

        await tx.unsafe(
          `INSERT INTO moments (content, media, locale, visibility, status, published_at, created_at, updated_at)
           VALUES ($1, (($2::jsonb #>> '{}')::jsonb), $3, 'public', $4, $5, $6, $7)`,
          [
            content,
            JSON.stringify(media),
            asLocale(row.locale),
            asStatus(row.status),
            publishedAt,
            createdAt,
            updatedAt,
          ]
        );
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
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
