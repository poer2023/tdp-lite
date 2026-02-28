import { createHash, createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { APP_LOCALES } from "../src/lib/locale";
import {
  fetchPublicGallery,
  fetchPublicMoments,
  fetchPublicPosts,
  type Locale,
} from "../src/lib/publicApi";
import { buildSearchSnapshot } from "../src/lib/search/searchSnapshot";

const SEARCH_INDEX_DIR = path.join(process.cwd(), "data", "search-index");
const WRITE_LOCAL = process.env.SEARCH_SYNC_WRITE_LOCAL !== "false";

function sha256Hex(input: Uint8Array | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalQuery(raw: string): string {
  if (!raw) return "";
  return raw.split("&").filter(Boolean).sort().join("&");
}

function buildSignature(params: {
  method: string;
  path: string;
  query: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
  secret: string;
}): string {
  const canonical = [
    params.method.toUpperCase(),
    params.path,
    canonicalQuery(params.query),
    params.timestamp,
    params.nonce,
    params.bodyHash.toLowerCase(),
  ].join("\n");

  return createHmac("sha256", params.secret).update(canonical).digest("hex");
}

function resolveApiBaseUrl(): string {
  const explicitBase =
    process.env.TDP_API_BASE_URL || process.env.NEXT_PUBLIC_TDP_API_BASE_URL;
  if (explicitBase && explicitBase.trim().length > 0) {
    return explicitBase.replace(/\/$/, "");
  }
  const apiAddr = process.env.TDP_API_ADDR?.trim();
  if (apiAddr) {
    if (/^:\d+$/.test(apiAddr)) {
      return `http://localhost${apiAddr}`;
    }
    if (/^https?:\/\//.test(apiAddr)) {
      return apiAddr.replace(/\/$/, "");
    }
  }
  return "http://localhost:8080";
}

async function postSnapshotToApi(locale: Locale, snapshot: unknown): Promise<void> {
  const keyId = process.env.TDP_INTERNAL_KEY_ID?.trim();
  const keySecret = process.env.TDP_INTERNAL_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return;
  }

  const pathWithQuery = "/v1/internal/search-snapshot";
  const [pathOnly, query = ""] = pathWithQuery.split("?");
  const raw = JSON.stringify(snapshot);
  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  const signature = buildSignature({
    method: "POST",
    path: pathOnly,
    query,
    timestamp,
    nonce,
    bodyHash: sha256Hex(raw),
    secret: keySecret,
  });

  const response = await fetch(`${resolveApiBaseUrl()}${pathWithQuery}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-TDP-Key-Id": keyId,
      "X-TDP-Timestamp": timestamp,
      "X-TDP-Nonce": nonce,
      "X-TDP-Signature": signature,
    },
    body: raw,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `api upsert failed for locale=${locale} (${response.status}): ${text.slice(0, 320)}`
    );
  }
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(SEARCH_INDEX_DIR, { recursive: true });
}

async function writeSnapshotAtomic(locale: Locale, content: string): Promise<void> {
  const filePath = path.join(SEARCH_INDEX_DIR, `${locale}.json`);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}

async function syncLocale(locale: Locale): Promise<void> {
  const [posts, moments, gallery] = await Promise.all([
    fetchPublicPosts(locale),
    fetchPublicMoments(locale),
    fetchPublicGallery(locale),
  ]);

  const snapshot = buildSearchSnapshot({
    locale,
    posts,
    moments,
    gallery,
  });

  if (WRITE_LOCAL) {
    await writeSnapshotAtomic(locale, `${JSON.stringify(snapshot, null, 2)}\n`);
  }

  await postSnapshotToApi(locale, snapshot);

  console.log(
    `[search-sync] locale=${locale} posts=${snapshot.counts.post} moments=${snapshot.counts.moment} gallery=${snapshot.counts.gallery} local=${WRITE_LOCAL} api=${Boolean(process.env.TDP_INTERNAL_KEY_ID && process.env.TDP_INTERNAL_KEY_SECRET)}`
  );
}

async function main(): Promise<void> {
  const hasApiUpsertTarget = Boolean(
    process.env.TDP_INTERNAL_KEY_ID?.trim() && process.env.TDP_INTERNAL_KEY_SECRET?.trim()
  );
  if (!WRITE_LOCAL && !hasApiUpsertTarget) {
    throw new Error(
      "No search snapshot target enabled. Set SEARCH_SYNC_WRITE_LOCAL=true or provide TDP_INTERNAL_KEY_ID/TDP_INTERNAL_KEY_SECRET."
    );
  }

  if (WRITE_LOCAL) {
    await ensureDir();
  }

  for (const locale of APP_LOCALES) {
    await syncLocale(locale);
  }

  if (WRITE_LOCAL) {
    console.log(`[search-sync] wrote snapshots to ${SEARCH_INDEX_DIR}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[search-sync] ${message}`);
  process.exit(1);
});
