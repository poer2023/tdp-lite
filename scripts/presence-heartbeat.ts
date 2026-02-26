import { createHash, createHmac, randomUUID } from "node:crypto";

type ArgMap = Record<string, string>;

function parseArgs(argv: string[]): ArgMap {
  const result: ArgMap = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw || !raw.startsWith("--")) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = next;
    i += 1;
  }
  return result;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalQuery(rawQuery: string): string {
  if (!rawQuery) return "";
  return rawQuery
    .split("&")
    .filter(Boolean)
    .sort()
    .join("&");
}

function buildSignature(params: {
  keySecret: string;
  method: string;
  path: string;
  query: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}): string {
  const canonical = [
    params.method.toUpperCase(),
    params.path,
    canonicalQuery(params.query),
    params.timestamp,
    params.nonce,
    params.bodyHash.toLowerCase(),
  ].join("\n");

  return createHmac("sha256", params.keySecret).update(canonical).digest("hex");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const city = (args.city || "").trim();
  const region = (args.region || "").trim();
  const country = (args.country || "").trim();
  const countryCode = (args["country-code"] || args.countryCode || "").trim();
  const timezone =
    (args.timezone || "").trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const source = (args.source || "manual").trim();

  if (!city) {
    throw new Error(
      "Missing required --city. Example: pnpm presence:heartbeat -- --city Tokyo --country Japan --country-code JP"
    );
  }

  const baseUrl = (
    process.env.TDP_API_BASE_URL ||
    process.env.NEXT_PUBLIC_TDP_API_BASE_URL ||
    "http://127.0.0.1:8080"
  ).replace(/\/$/, "");
  const keyID = process.env.TDP_INTERNAL_KEY_ID || "";
  const keySecret = process.env.TDP_INTERNAL_KEY_SECRET || "";
  if (!keyID || !keySecret) {
    throw new Error("Missing TDP_INTERNAL_KEY_ID or TDP_INTERNAL_KEY_SECRET in env.");
  }

  const path = "/v1/internal/presence";
  const method = "POST";
  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  const payload = {
    city,
    ...(region ? { region } : {}),
    ...(country ? { country } : {}),
    ...(countryCode ? { countryCode } : {}),
    ...(timezone ? { timezone } : {}),
    ...(source ? { source } : {}),
  };
  const body = JSON.stringify(payload);
  const bodyHash = sha256Hex(body);
  const signature = buildSignature({
    keySecret,
    method,
    path,
    query: "",
    timestamp,
    nonce,
    bodyHash,
  });

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-TDP-Key-Id": keyID,
      "X-TDP-Timestamp": timestamp,
      "X-TDP-Nonce": nonce,
      "X-TDP-Signature": signature,
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`presence heartbeat failed (${response.status}): ${text}`);
  }

  const data = text ? JSON.parse(text) : {};
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`[presence-heartbeat] ${message}`);
  process.exit(1);
});
