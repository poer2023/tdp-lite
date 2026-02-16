#!/usr/bin/env tsx

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

type CliOptions = {
  envFile: string;
  putDelete: boolean;
  help: boolean;
};

type ResolvedR2Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    envFile: ".env.local",
    putDelete: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--") continue;

    if (arg === "--env-file") {
      if (!next || next.startsWith("--")) {
        throw new Error("Missing value for --env-file");
      }
      options.envFile = next;
      i++;
      continue;
    }

    if (arg === "--put-delete") {
      options.putDelete = true;
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
  console.log(`Validate shared R2 configuration and connectivity.

Usage:
  pnpm r2:check -- [options]

Options:
  --env-file <path>   Env file to load (default: .env.local)
  --put-delete        Upload and delete a tiny probe object
  --help              Show this help

Examples:
  pnpm r2:check
  pnpm r2:check -- --put-delete
`);
}

function parseEnvFile(pathname: string): Record<string, string> {
  const absolute = resolve(pathname);
  if (!existsSync(absolute)) return {};

  const values: Record<string, string> = {};
  const content = readFileSync(absolute, "utf-8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    values[key] = value;
  }

  return values;
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function resolveConfig(envValues: Record<string, string>): ResolvedR2Config {
  const pick = (...keys: string[]): string | undefined =>
    firstDefined(
      ...keys.map((key) => process.env[key]),
      ...keys.map((key) => envValues[key])
    );

  const endpoint = firstDefined(
    pick("S3_ENDPOINT", "CLOUDFLARE_R2_ENDPOINT"),
    pick("R2_ACCOUNT_ID") ? `https://${pick("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com` : undefined
  );
  const region = firstDefined(pick("S3_REGION"), "auto")!;
  const accessKeyId = pick("S3_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID");
  const secretAccessKey = pick(
    "S3_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "R2_SECRET_ACCESS_KEY"
  );
  const bucket = pick("S3_BUCKET", "CLOUDFLARE_R2_BUCKET", "R2_BUCKET_NAME");
  const publicUrl = pick(
    "S3_CDN_URL",
    "S3_PUBLIC_BASE_URL",
    "R2_PUBLIC_URL",
    "NEXT_PUBLIC_R2_CDN_DOMAIN"
  );

  const missing: string[] = [];
  if (!endpoint) missing.push("S3_ENDPOINT/CLOUDFLARE_R2_ENDPOINT");
  if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID/CLOUDFLARE_R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY/CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("S3_BUCKET/CLOUDFLARE_R2_BUCKET");
  if (!publicUrl) missing.push("S3_CDN_URL/R2_PUBLIC_URL");

  if (missing.length > 0) {
    throw new Error(`R2 configuration is incomplete. Missing: ${missing.join(", ")}`);
  }

  return {
    endpoint: endpoint!,
    region,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: bucket!,
    publicUrl: publicUrl!.replace(/\/$/, ""),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const envValues = parseEnvFile(".env");
  Object.assign(envValues, parseEnvFile(options.envFile));

  const config = resolveConfig(envValues);
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(new HeadBucketCommand({ Bucket: config.bucket }));

  console.log("R2 bucket access check passed.");
  console.log(`Endpoint: ${config.endpoint}`);
  console.log(`Region: ${config.region}`);
  console.log(`Bucket: ${config.bucket}`);
  console.log(`Public URL base: ${config.publicUrl}`);

  if (options.putDelete) {
    const probeKey = `healthchecks/tdp-lite-${Date.now()}.txt`;
    const probeBody = "tdp-lite r2 connectivity check";

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: probeKey,
        Body: probeBody,
        ContentType: "text/plain",
      })
    );
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: probeKey,
      })
    );

    console.log(`Put/Delete probe passed: ${probeKey}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
