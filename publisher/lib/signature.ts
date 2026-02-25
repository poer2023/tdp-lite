import { createHash, createHmac } from "node:crypto";

export function sha256Hex(input: string | Uint8Array): string {
  const hasher = createHash("sha256");
  hasher.update(input);
  return hasher.digest("hex");
}

function canonicalQuery(rawQuery: string): string {
  if (!rawQuery) return "";
  return rawQuery
    .split("&")
    .filter(Boolean)
    .sort()
    .join("&");
}

export function buildTdpSignature(params: {
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
    params.bodyHash,
  ].join("\n");

  return createHmac("sha256", params.keySecret).update(canonical).digest("hex");
}
