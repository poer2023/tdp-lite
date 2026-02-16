import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const FALLBACK_SECRET = "preview-secret-change-me";

function getPreviewSigningSecret(): string {
  return (
    process.env.PUBLISH_PREVIEW_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    FALLBACK_SECRET
  );
}

function computeSignature(sessionId: string, expiresAtMs: number): string {
  const payload = `${sessionId}\n${expiresAtMs}`;
  return createHmac("sha256", getPreviewSigningSecret())
    .update(payload)
    .digest("hex");
}

function safeCompare(expected: string, received: string): boolean {
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

export function signPreviewAccess(
  sessionId: string,
  expiresAtMs: number
): string {
  return computeSignature(sessionId, expiresAtMs);
}

export function verifyPreviewAccess(params: {
  sessionId: string;
  expiresAtMs: number;
  signature: string;
  now?: number;
}): boolean {
  const now = params.now ?? Date.now();
  if (params.expiresAtMs < now) {
    return false;
  }

  const expected = computeSignature(params.sessionId, params.expiresAtMs);
  return safeCompare(expected, params.signature);
}
