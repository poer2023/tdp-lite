import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export type VerifiedPublisherRequest =
  | { ok: true; keyId: string }
  | { ok: false; reason: string };

type SignatureInput = {
  method: string;
  path: string;
  timestamp: string;
  bodyHash: string;
};

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function getPublisherSecrets(): Record<string, string> {
  const explicit = process.env.PUBLISHER_KEYS;
  if (explicit) {
    try {
      const parsed = JSON.parse(explicit) as Record<string, unknown>;
      const entries = Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" &&
          typeof entry[1] === "string" &&
          entry[1].trim().length > 0
      );
      if (entries.length > 0) {
        return Object.fromEntries(entries);
      }
    } catch {
      // Fall through to single-key env strategy.
    }
  }

  const keyId = process.env.PUBLISHER_KEY_ID;
  const keySecret = process.env.PUBLISHER_KEY_SECRET;
  if (keyId && keySecret) {
    return { [keyId]: keySecret };
  }

  return {};
}

export function sha256Hex(input: string | Uint8Array): string {
  const hasher = createHash("sha256");
  hasher.update(input);
  return hasher.digest("hex");
}

function createSignature(secret: string, input: SignatureInput): string {
  const canonical = [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.bodyHash,
  ].join("\n");

  return createHmac("sha256", secret).update(canonical).digest("hex");
}

function equalsHex(expected: string, received: string): boolean {
  try {
    const left = Buffer.from(expected, "hex");
    const right = Buffer.from(received, "hex");
    if (left.length !== right.length) {
      return false;
    }
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function buildPublisherSignature(
  secret: string,
  input: SignatureInput
): string {
  return createSignature(secret, input);
}

export function verifyPublisherRequest(
  headers: Headers,
  input: SignatureInput,
  now: number = Date.now()
): VerifiedPublisherRequest {
  const keyId = headers.get("x-publisher-key-id");
  const timestamp = headers.get("x-publisher-ts");
  const signature = headers.get("x-publisher-signature");

  if (!keyId || !timestamp || !signature) {
    return { ok: false, reason: "missing publisher authentication headers" };
  }

  if (timestamp !== input.timestamp) {
    return { ok: false, reason: "timestamp header mismatch" };
  }

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) {
    return { ok: false, reason: "invalid timestamp format" };
  }

  if (Math.abs(now - timestampNumber) > FIVE_MINUTES_MS) {
    return { ok: false, reason: "timestamp is outside accepted window" };
  }

  const secrets = getPublisherSecrets();
  const secret = secrets[keyId];
  if (!secret) {
    return { ok: false, reason: "unknown publisher key id" };
  }

  const expected = createSignature(secret, input);
  if (!equalsHex(expected, signature)) {
    return { ok: false, reason: "invalid signature" };
  }

  return { ok: true, keyId };
}
