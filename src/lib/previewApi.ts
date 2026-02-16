import { previewDraftPayloadSchema } from "@/lib/publish/contracts";

function getBaseUrl(): string {
  return (
    process.env.TDP_API_BASE_URL ||
    process.env.NEXT_PUBLIC_TDP_API_BASE_URL ||
    "http://localhost:8080"
  ).replace(/\/$/, "");
}

function firstValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function loadPreviewPayloadFromApi(searchParams: {
  [key: string]: string | string[] | undefined;
}): Promise<
  | { ok: true; payload: ReturnType<typeof previewDraftPayloadSchema.parse> }
  | { ok: false; reason: string }
> {
  const sid = firstValue(searchParams.sid);
  const exp = firstValue(searchParams.exp);
  const sig = firstValue(searchParams.sig);

  if (!sid || !exp || !sig) {
    return { ok: false, reason: "missing preview token params" };
  }

  const url = `${getBaseUrl()}/v1/previews/sessions/${encodeURIComponent(sid)}/payload?exp=${encodeURIComponent(exp)}&sig=${encodeURIComponent(sig)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    return { ok: false, reason: `preview service unavailable${detail}` };
  }

  if (!response.ok) {
    return { ok: false, reason: `preview payload fetch failed (${response.status})` };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "preview payload response is invalid JSON" };
  }

  const payload =
    typeof body === "object" && body !== null && "payload" in body
      ? (body as { payload?: unknown }).payload
      : undefined;
  const parsed = previewDraftPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, reason: "preview payload format invalid" };
  }

  return { ok: true, payload: parsed.data };
}
