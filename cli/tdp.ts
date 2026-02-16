#!/usr/bin/env node

import { createHash, createHmac, randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_PATH = join(homedir(), ".tdp-lite.json");

type ContentKind = "post" | "moment" | "gallery";

type Config = {
  endpoint?: string;
  keyId?: string;
  keySecret?: string;
};

function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config;
  } catch {
    return {};
  }
}

function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function sha256Hex(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalQuery(rawQuery: string): string {
  if (!rawQuery) return "";
  const pairs = rawQuery
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const [k, v = ""] = pair.split("=");
      return `${k}=${v}`;
    })
    .sort();
  return pairs.join("&");
}

function buildSignature(input: {
  method: string;
  path: string;
  rawQuery: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
  secret: string;
}): string {
  const canonical = [
    input.method.toUpperCase(),
    input.path,
    canonicalQuery(input.rawQuery),
    input.timestamp,
    input.nonce,
    input.bodyHash,
  ].join("\n");
  return createHmac("sha256", input.secret).update(canonical).digest("hex");
}

function requireConfig(): Required<Config> {
  const config = loadConfig();
  if (!config.endpoint || !config.keyId || !config.keySecret) {
    throw new Error(
      "Missing CLI config. Run: tdp auth init --endpoint <url> --key-id <id> --key-secret <secret>"
    );
  }
  return {
    endpoint: config.endpoint.replace(/\/$/, ""),
    keyId: config.keyId,
    keySecret: config.keySecret,
  };
}

function parseFlag(args: string[], key: string, short?: string): string | undefined {
  const candidates = [key];
  if (short) candidates.push(short);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (candidates.includes(arg)) {
      return args[i + 1];
    }
    const prefix = `${key}=`;
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }

  return undefined;
}

function parseScopes(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function contentPath(kind: ContentKind): string {
  switch (kind) {
    case "post":
      return "posts";
    case "moment":
      return "moments";
    case "gallery":
      return "gallery-items";
    default:
      return "posts";
  }
}

function guessMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    json: "application/json",
    md: "text/markdown",
    txt: "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}

async function signedRequest(
  method: string,
  pathWithQuery: string,
  options: {
    body?: unknown;
    rawBody?: Buffer;
    idempotencyKey?: string;
    extraHeaders?: Record<string, string>;
  } = {}
): Promise<Response> {
  const config = requireConfig();

  const [path, rawQuery = ""] = pathWithQuery.split("?");
  const timestamp = String(Date.now());
  const nonce = randomUUID();

  let bodyBytes: Buffer = Buffer.alloc(0);
  let body: BodyInit | undefined;
  let contentType = "application/json";

  if (options.rawBody) {
    bodyBytes = options.rawBody;
    body = new Uint8Array(options.rawBody);
    contentType = options.extraHeaders?.["Content-Type"] || "application/octet-stream";
  } else if (options.body !== undefined) {
    const raw = JSON.stringify(options.body);
    bodyBytes = Buffer.from(raw);
    body = raw;
    contentType = "application/json";
  }

  const signature = buildSignature({
    method,
    path,
    rawQuery,
    timestamp,
    nonce,
    bodyHash: sha256Hex(bodyBytes),
    secret: config.keySecret,
  });

  const headers: Record<string, string> = {
    "X-TDP-Key-Id": config.keyId,
    "X-TDP-Timestamp": timestamp,
    "X-TDP-Nonce": nonce,
    "X-TDP-Signature": signature,
    ...options.extraHeaders,
  };

  if (body) {
    headers["Content-Type"] = contentType;
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const response = await fetch(`${config.endpoint}${pathWithQuery}`, {
    method,
    headers,
    body,
  });

  return response;
}

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function asRecord(value: unknown): JsonObject {
  return isJsonObject(value) ? value : {};
}

function jsonMessage(value: unknown): string | null {
  if (!isJsonObject(value)) return null;
  const error = value.error;
  if (isJsonObject(error) && typeof error.message === "string") {
    return error.message;
  }
  if (typeof value.message === "string") {
    return value.message;
  }
  return null;
}

async function readJsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message = jsonMessage(parsed) || text || response.statusText;
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  return parsed;
}

function loadPayloadFromArg(args: string[]): unknown {
  const file = parseFlag(args, "--file", "-f");
  const jsonRaw = parseFlag(args, "--json", "-j");
  if (file) {
    return JSON.parse(readFileSync(file, "utf-8"));
  }
  if (jsonRaw) {
    return JSON.parse(jsonRaw);
  }
  throw new Error("missing payload. Use --file <json> or --json '<payload>'");
}

async function handleAuth(args: string[]) {
  const sub = args[0];
  if (sub === "init") {
    const endpoint = parseFlag(args, "--endpoint", "-e");
    const keyId = parseFlag(args, "--key-id", "-k");
    const keySecret = parseFlag(args, "--key-secret", "-s");
    if (!endpoint || !keyId || !keySecret) {
      throw new Error("usage: tdp auth init --endpoint <url> --key-id <id> --key-secret <secret>");
    }
    saveConfig({ endpoint: endpoint.replace(/\/$/, ""), keyId, keySecret });
    console.log("✓ auth config saved");
    return;
  }

  if (sub === "show") {
    const config = loadConfig();
    console.log(
      JSON.stringify(
        {
          endpoint: config.endpoint,
          keyId: config.keyId,
          keySecretConfigured: Boolean(config.keySecret),
        },
        null,
        2
      )
    );
    return;
  }

  throw new Error("usage: tdp auth <init|show>");
}

async function handleContent(args: string[]) {
  const action = args[0];
  if (action === "create") {
    const kind = args[1] as ContentKind;
    if (!["post", "moment", "gallery"].includes(kind)) {
      throw new Error("usage: tdp content create <post|moment|gallery> --file payload.json");
    }

    const payload = loadPayloadFromArg(args.slice(2));
    const idempotencyKey = parseFlag(args, "--idempotency-key") || randomUUID();
    const response = await signedRequest("POST", `/v1/${contentPath(kind)}`, {
      body: payload,
      idempotencyKey,
    });
    const data = await readJsonOrThrow(response);
    const item = asRecord(asRecord(data).item);
    const itemId = typeof item.id === "string" ? item.id : "unknown";
    console.log(`✓ created ${kind}: ${itemId}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (action === "update") {
    const kind = args[1] as ContentKind;
    const id = args[2];
    if (!["post", "moment", "gallery"].includes(kind) || !id) {
      throw new Error("usage: tdp content update <post|moment|gallery> <id> --file patch.json");
    }

    const payload = loadPayloadFromArg(args.slice(3));
    const idempotencyKey = parseFlag(args, "--idempotency-key") || randomUUID();
    const response = await signedRequest("PATCH", `/v1/${contentPath(kind)}/${id}`, {
      body: payload,
      idempotencyKey,
    });
    const data = await readJsonOrThrow(response);
    console.log(`✓ updated ${kind}: ${id}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (action === "publish" || action === "unpublish") {
    const kind = args[1] as ContentKind;
    const id = args[2];
    if (!["post", "moment", "gallery"].includes(kind) || !id) {
      throw new Error(`usage: tdp content ${action} <post|moment|gallery> <id>`);
    }

    const verb = action === "publish" ? "publish" : "unpublish";
    const response = await signedRequest("POST", `/v1/${contentPath(kind)}/${id}/${verb}`, {
      body: {},
    });
    const data = await readJsonOrThrow(response);
    console.log(`✓ ${verb} ${kind}: ${id}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (action === "delete") {
    const kind = args[1] as ContentKind;
    const id = args[2];
    if (!["post", "moment", "gallery"].includes(kind) || !id) {
      throw new Error("usage: tdp content delete <post|moment|gallery> <id>");
    }

    const response = await signedRequest("DELETE", `/v1/${contentPath(kind)}/${id}`);
    await readJsonOrThrow(response);
    console.log(`✓ deleted ${kind}: ${id}`);
    return;
  }

  throw new Error("usage: tdp content <create|update|publish|unpublish|delete> ...");
}

async function handleMedia(args: string[]) {
  const action = args[0];
  if (action !== "upload") {
    throw new Error("usage: tdp media upload <file>");
  }

  const filePath = args[1];
  if (!filePath) {
    throw new Error("usage: tdp media upload <file>");
  }

  const bytes = readFileSync(filePath);
  const mimeType = guessMimeType(filePath);
  const sha256 = sha256Hex(bytes);

  const initRes = await signedRequest("POST", "/v1/media/uploads", {
    body: {
      filename: filePath.split("/").pop(),
      mimeType,
      size: bytes.length,
      sha256,
    },
    idempotencyKey: randomUUID(),
  });
  const initData = asRecord(await readJsonOrThrow(initRes));
  const uploadId =
    typeof initData.uploadId === "string" ? initData.uploadId : null;
  if (!uploadId) {
    throw new Error("invalid upload init response: missing uploadId");
  }

  const uploadUrl =
    typeof initData.uploadUrl === "string" ? initData.uploadUrl : null;
  const uploadMethod =
    typeof initData.uploadMethod === "string" ? initData.uploadMethod : "PUT";
  const uploadHeadersRaw = asRecord(initData.uploadHeaders);
  const uploadHeaders = Object.fromEntries(
    Object.entries(uploadHeadersRaw).filter(([, value]) => typeof value === "string")
  ) as Record<string, string>;

  if (uploadUrl) {
    const uploadResponse = await fetch(uploadUrl, {
      method: uploadMethod,
      headers:
        Object.keys(uploadHeaders).length > 0
          ? uploadHeaders
          : {
              "Content-Type": mimeType,
            },
      body: bytes,
    });
    if (!uploadResponse.ok) {
      throw new Error(`file upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
  }

  const completeRes = await signedRequest(
    "POST",
    `/v1/media/uploads/${uploadId}/complete`,
    {
      body: {
        size: bytes.length,
        sha256,
      },
      idempotencyKey: randomUUID(),
    }
  );
  const completeData = await readJsonOrThrow(completeRes);
  const completeDataRecord = asRecord(completeData);
  const completeAsset = asRecord(completeDataRecord.asset);
  const completeAssetId =
    typeof completeAsset.id === "string" ? completeAsset.id : null;

  console.log(`✓ uploaded: ${completeAssetId || uploadId}`);
  console.log(JSON.stringify(completeData, null, 2));
}

async function handlePreview(args: string[]) {
  const action = args[0];
  if (action !== "create") {
    throw new Error("usage: tdp preview create <post|moment|gallery> <content-id>");
  }
  const kind = args[1] as ContentKind;
  const contentId = args[2];
  if (!["post", "moment", "gallery"].includes(kind) || !contentId) {
    throw new Error("usage: tdp preview create <post|moment|gallery> <content-id>");
  }

  const response = await signedRequest("POST", "/v1/previews/sessions", {
    body: { kind, contentId },
    idempotencyKey: randomUUID(),
  });
  const data = await readJsonOrThrow(response);
  console.log("✓ preview session created");
  console.log(JSON.stringify(data, null, 2));
}

async function handleAI(args: string[]) {
  const action = args[0];
  if (action !== "suggest") {
    throw new Error("usage: tdp ai suggest <post|moment|gallery> <content-id> --provider <provider> --model <model>");
  }

  const kind = args[1] as ContentKind;
  const contentId = args[2];
  const provider = parseFlag(args, "--provider", "-p") || "openai";
  const model = parseFlag(args, "--model", "-m") || "gpt-4.1-mini";
  const prompt = parseFlag(args, "--prompt") || "Analyze and propose improvements.";

  if (!["post", "moment", "gallery"].includes(kind) || !contentId) {
    throw new Error("usage: tdp ai suggest <post|moment|gallery> <content-id> --provider <provider> --model <model>");
  }

  const response = await signedRequest("POST", "/v1/ai/jobs", {
    body: {
      kind,
      contentId,
      provider,
      model,
      prompt,
    },
    idempotencyKey: randomUUID(),
  });
  const data = await readJsonOrThrow(response);
  const job = asRecord(asRecord(data).job);
  const jobId = typeof job.id === "string" ? job.id : "unknown";
  console.log(`✓ ai job created: ${jobId}`);
  console.log(JSON.stringify(data, null, 2));
}

async function handleJobs(args: string[]) {
  const action = args[0];
  if (action !== "watch") {
    throw new Error("usage: tdp jobs watch <job-id>");
  }
  const jobId = args[1];
  if (!jobId) {
    throw new Error("usage: tdp jobs watch <job-id>");
  }

  const intervalMs = Number(parseFlag(args, "--interval-ms")) || 2000;
  const timeoutMs = Number(parseFlag(args, "--timeout-ms")) || 120000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await signedRequest("GET", `/v1/jobs/${jobId}`);
    const data = await readJsonOrThrow(response);
    const statusRaw = asRecord(data).status;
    const status = typeof statusRaw === "string" ? statusRaw : "unknown";
    console.log(`[${new Date().toISOString()}] status=${status}`);

    if (["succeeded", "failed", "canceled"].includes(status)) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`job watch timeout: ${jobId}`);
}

async function handleKeys(args: string[]) {
  const action = args[0];

  if (action === "ls") {
    const response = await signedRequest("GET", "/v1/keys");
    const data = await readJsonOrThrow(response);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (action === "create") {
    const name = parseFlag(args, "--name") || "tdp-key";
    const scopes = parseScopes(parseFlag(args, "--scopes"));
    const response = await signedRequest("POST", "/v1/keys", {
      body: { name, scopes },
      idempotencyKey: randomUUID(),
    });
    const data = await readJsonOrThrow(response);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (action === "rotate") {
    const keyId = args[1];
    if (!keyId) throw new Error("usage: tdp keys rotate <key-id>");
    const response = await signedRequest("POST", `/v1/keys/${keyId}/rotate`, {
      body: { reason: parseFlag(args, "--reason") || "manual rotate" },
    });
    const data = await readJsonOrThrow(response);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (action === "revoke") {
    const keyId = args[1];
    if (!keyId) throw new Error("usage: tdp keys revoke <key-id>");
    const response = await signedRequest("POST", `/v1/keys/${keyId}/revoke`, {
      body: {},
    });
    const data = await readJsonOrThrow(response);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  throw new Error("usage: tdp keys <ls|create|rotate|revoke>");
}

async function help() {
  console.log(`
TDP CLI v2

Usage:
  tdp auth init --endpoint <url> --key-id <id> --key-secret <secret>
  tdp auth show

  tdp content create <post|moment|gallery> --file payload.json
  tdp content update <post|moment|gallery> <id> --file patch.json
  tdp content publish <post|moment|gallery> <id>
  tdp content unpublish <post|moment|gallery> <id>
  tdp content delete <post|moment|gallery> <id>

  tdp media upload <file>
  tdp preview create <post|moment|gallery> <content-id>

  tdp ai suggest <post|moment|gallery> <content-id> --provider <provider> --model <model>
  tdp jobs watch <job-id>

  tdp keys ls
  tdp keys create --name "Publisher" --scopes content:write,media:write
  tdp keys rotate <key-id>
  tdp keys revoke <key-id>
`);
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    await help();
    return;
  }

  switch (command) {
    case "auth":
      await handleAuth(args);
      return;
    case "content":
      await handleContent(args);
      return;
    case "media":
      await handleMedia(args);
      return;
    case "preview":
      await handlePreview(args);
      return;
    case "ai":
      await handleAI(args);
      return;
    case "jobs":
      await handleJobs(args);
      return;
    case "keys":
      await handleKeys(args);
      return;
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
