import { previewDraftPayloadSchema } from "./contracts";
import { getPreviewSessionById } from "./previewSession";
import { verifyPreviewAccess } from "./previewToken";

function firstValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value;
}

export async function loadPreviewPayload(searchParams: {
  [key: string]: string | string[] | undefined;
}): Promise<
  | { ok: true; payload: ReturnType<typeof previewDraftPayloadSchema.parse> }
  | { ok: false; reason: string }
> {
  const sessionId = firstValue(searchParams.sid);
  const expiresRaw = firstValue(searchParams.exp);
  const signature = firstValue(searchParams.sig);

  if (!sessionId || !expiresRaw || !signature) {
    return { ok: false, reason: "missing preview token params" };
  }

  const expiresAtMs = Number(expiresRaw);
  if (!Number.isFinite(expiresAtMs)) {
    return { ok: false, reason: "invalid preview expiry format" };
  }

  const isValidAccess = verifyPreviewAccess({
    sessionId,
    expiresAtMs,
    signature,
  });
  if (!isValidAccess) {
    return { ok: false, reason: "preview token expired or invalid" };
  }

  const record = await getPreviewSessionById(sessionId);
  if (!record) {
    return { ok: false, reason: "preview session not found" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "preview session expired" };
  }

  try {
    const payload = previewDraftPayloadSchema.parse(record.payload);
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "preview payload format invalid" };
  }
}
