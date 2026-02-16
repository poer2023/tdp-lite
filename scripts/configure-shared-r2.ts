#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type CliOptions = {
  endpoint?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  cdnUrl?: string;
  envFile: string;
  fromStorageJson?: string;
  skipLegacyAliases: boolean;
  dryRun: boolean;
  help: boolean;
};

type StorageJsonConfig = {
  endpoint?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  cdnUrl?: string;
};

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    envFile: ".env.local",
    skipLegacyAliases: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--") continue;

    const readValue = (): string => {
      if (!next || next.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      i++;
      return next;
    };

    if (arg === "--endpoint") options.endpoint = readValue();
    else if (arg === "--region") options.region = readValue();
    else if (arg === "--access-key-id") options.accessKeyId = readValue();
    else if (arg === "--secret-access-key") options.secretAccessKey = readValue();
    else if (arg === "--bucket") options.bucket = readValue();
    else if (arg === "--cdn-url") options.cdnUrl = readValue();
    else if (arg === "--env-file") options.envFile = readValue();
    else if (arg === "--from-storage-json") options.fromStorageJson = readValue();
    else if (arg === "--skip-legacy-aliases") options.skipLegacyAliases = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log(`Configure shared production R2 settings in .env.local

Usage:
  pnpm r2:configure -- [options]

Options:
  --endpoint <url>              R2 endpoint, e.g. https://<account>.r2.cloudflarestorage.com
  --region <region>             Region for SDK (default: auto)
  --access-key-id <key>         R2 access key id
  --secret-access-key <secret>  R2 secret access key
  --bucket <name>               Shared production bucket name
  --cdn-url <url>               Public CDN/base URL for generated file URLs
  --env-file <path>             Target env file (default: .env.local)
  --from-storage-json <path>    Read values from tdp storage json export
  --skip-legacy-aliases         Do not write CLOUDFLARE_R2_* aliases
  --dry-run                     Preview changes without writing file
  --help                        Show this help

Examples:
  pnpm r2:configure -- --from-storage-json /Users/wanghao/Project/tdp/.storage-config.json
  pnpm r2:configure -- --endpoint https://xxx.r2.cloudflarestorage.com --access-key-id abc --secret-access-key def --bucket media --cdn-url https://pub-xxx.r2.dev
`);
}

function readStorageJson(filePath: string): StorageJsonConfig {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Storage config file not found: ${absolutePath}`);
  }
  const raw = readFileSync(absolutePath, "utf-8");
  const parsed = JSON.parse(raw) as StorageJsonConfig;
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid JSON content in ${absolutePath}`);
  }
  return parsed;
}

function mergeConfig(options: CliOptions): Required<StorageJsonConfig> {
  let jsonConfig: StorageJsonConfig = {};
  if (options.fromStorageJson) {
    jsonConfig = readStorageJson(options.fromStorageJson);
  }

  const merged = {
    endpoint: options.endpoint || jsonConfig.endpoint,
    region: options.region || jsonConfig.region || "auto",
    accessKeyId: options.accessKeyId || jsonConfig.accessKeyId,
    secretAccessKey: options.secretAccessKey || jsonConfig.secretAccessKey,
    bucket: options.bucket || jsonConfig.bucket,
    cdnUrl: options.cdnUrl || jsonConfig.cdnUrl,
  };

  const missing: string[] = [];
  if (!merged.endpoint) missing.push("endpoint");
  if (!merged.accessKeyId) missing.push("access-key-id");
  if (!merged.secretAccessKey) missing.push("secret-access-key");
  if (!merged.bucket) missing.push("bucket");
  if (!merged.cdnUrl) missing.push("cdn-url");

  if (missing.length > 0) {
    throw new Error(`Missing required values: ${missing.join(", ")}`);
  }

  return {
    endpoint: merged.endpoint!,
    region: merged.region!,
    accessKeyId: merged.accessKeyId!,
    secretAccessKey: merged.secretAccessKey!,
    bucket: merged.bucket!,
    cdnUrl: merged.cdnUrl!.replace(/\/$/, ""),
  };
}

function upsertEnvValues(existingContent: string, updates: Record<string, string>): string {
  const lines = existingContent.length > 0 ? existingContent.split(/\r?\n/) : [];
  const keys = Object.keys(updates);
  const seen = new Set<string>();

  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return line;

    const key = match[1];
    if (!(key in updates)) return line;

    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const key of keys) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${updates[key]}`);
    }
  }

  return `${nextLines.join("\n").replace(/\n+$/, "")}\n`;
}

function mask(value: string): string {
  if (value.length <= 4) return "***";
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function printSummary(filePath: string, config: Required<StorageJsonConfig>, includeLegacy: boolean): void {
  console.log(`Target file: ${filePath}`);
  console.log(`S3_ENDPOINT=${config.endpoint}`);
  console.log(`S3_REGION=${config.region}`);
  console.log(`S3_BUCKET=${config.bucket}`);
  console.log(`S3_CDN_URL=${config.cdnUrl}`);
  console.log(`S3_ACCESS_KEY_ID=${mask(config.accessKeyId)}`);
  console.log(`S3_SECRET_ACCESS_KEY=${mask(config.secretAccessKey)}`);
  console.log(`Legacy aliases: ${includeLegacy ? "written" : "skipped"}`);
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const config = mergeConfig(options);
  const envFilePath = resolve(options.envFile);
  const existingContent = existsSync(envFilePath) ? readFileSync(envFilePath, "utf-8") : "";

  const updates: Record<string, string> = {
    S3_ENDPOINT: config.endpoint,
    S3_REGION: config.region,
    S3_ACCESS_KEY_ID: config.accessKeyId,
    S3_SECRET_ACCESS_KEY: config.secretAccessKey,
    S3_BUCKET: config.bucket,
    S3_CDN_URL: config.cdnUrl,
  };

  if (!options.skipLegacyAliases) {
    updates.CLOUDFLARE_R2_ENDPOINT = config.endpoint;
    updates.CLOUDFLARE_R2_ACCESS_KEY_ID = config.accessKeyId;
    updates.CLOUDFLARE_R2_SECRET_ACCESS_KEY = config.secretAccessKey;
    updates.CLOUDFLARE_R2_BUCKET = config.bucket;
    updates.R2_PUBLIC_URL = config.cdnUrl;
  }

  const nextContent = upsertEnvValues(existingContent, updates);

  if (options.dryRun) {
    console.log("Dry run only. No file was written.");
    printSummary(envFilePath, config, !options.skipLegacyAliases);
    return;
  }

  writeFileSync(envFilePath, nextContent, "utf-8");
  console.log("Shared R2 configuration updated successfully.");
  printSummary(envFilePath, config, !options.skipLegacyAliases);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
