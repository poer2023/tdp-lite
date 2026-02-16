#!/usr/bin/env node

import crypto from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const API_BASE_URL = (process.env.TDP_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const ROOT_KEY_ID = process.env.TDP_CI_KEY_ID || "ci_root";
const ROOT_KEY_SECRET = process.env.TDP_CI_KEY_SECRET || "ci_root_secret";

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacSha256Hex(secret, input) {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

function queryEscape(input) {
  return encodeURIComponent(input)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalQuery(rawQuery) {
  if (!rawQuery) return "";
  const params = new URLSearchParams(rawQuery);
  const valuesByKey = new Map();
  for (const [key, value] of params.entries()) {
    if (!valuesByKey.has(key)) {
      valuesByKey.set(key, []);
    }
    valuesByKey.get(key).push(value);
  }
  const keys = [...valuesByKey.keys()].sort();
  const parts = [];
  for (const key of keys) {
    const values = valuesByKey.get(key).slice().sort();
    for (const value of values) {
      parts.push(`${queryEscape(key)}=${queryEscape(value)}`);
    }
  }
  return parts.join("&");
}

function canonicalString({ method, path, rawQuery, timestamp, nonce, bodyHash }) {
  return [
    method.toUpperCase(),
    path,
    canonicalQuery(rawQuery),
    timestamp,
    nonce,
    bodyHash.toLowerCase(),
  ].join("\n");
}

function extractErrorCode(payload) {
  if (payload && typeof payload === "object" && payload.error && typeof payload.error === "object") {
    return payload.error.code || null;
  }
  return null;
}

function extractErrorMessage(payload) {
  if (payload && typeof payload === "object" && payload.error && typeof payload.error === "object") {
    return payload.error.message || null;
  }
  if (payload && typeof payload === "object" && typeof payload.message === "string") {
    return payload.message;
  }
  return null;
}

async function callApi(options) {
  const {
    method,
    path,
    query,
    body,
    signed = true,
    keyId = ROOT_KEY_ID,
    keySecret = ROOT_KEY_SECRET,
    idempotencyKey,
    expectedStatus,
    timestamp,
    nonce,
    signatureOverride,
  } = options;

  const url = new URL(path, API_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    Accept: "application/json",
  };

  let bodyText = "";
  if (body !== undefined) {
    bodyText = typeof body === "string" ? body : JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  if (signed) {
    const ts = timestamp || String(Date.now());
    const n = nonce || crypto.randomUUID();
    const bodyHash = sha256Hex(bodyText);
    const canonical = canonicalString({
      method,
      path: url.pathname,
      rawQuery: url.search.length > 0 ? url.search.slice(1) : "",
      timestamp: ts,
      nonce: n,
      bodyHash,
    });
    const signature = signatureOverride || hmacSha256Hex(keySecret, canonical);

    headers["X-TDP-Key-Id"] = keyId;
    headers["X-TDP-Timestamp"] = ts;
    headers["X-TDP-Nonce"] = n;
    headers["X-TDP-Signature"] = signature;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: bodyText ? bodyText : undefined,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (expectedStatus !== undefined) {
    const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!expected.includes(response.status)) {
      const message = extractErrorMessage(json) || text || response.statusText;
      fail(
        `unexpected status for ${method} ${path}: got ${response.status}, expected ${expected.join(", ")}; message=${message}`
      );
    }
  } else if (!response.ok) {
    const message = extractErrorMessage(json) || text || response.statusText;
    fail(`request failed for ${method} ${path}: ${response.status} ${message}`);
  }

  return {
    status: response.status,
    json,
    text,
    headers: response.headers,
  };
}

async function pollAIJobUntilSucceeded(jobId, timeoutMs = 90000) {
  const start = Date.now();
  for (;;) {
    const response = await callApi({
      method: "GET",
      path: `/v1/ai/jobs/${jobId}`,
      signed: true,
      expectedStatus: 200,
    });
    const status = response?.json?.job?.status;
    if (status === "succeeded") return response.json.job;
    if (status === "failed" || status === "canceled") {
      fail(`ai job ${jobId} ended with status=${status}`);
    }
    if (Date.now() - start > timeoutMs) {
      fail(`timed out waiting for ai job ${jobId} to succeed`);
    }
    await delay(1000);
  }
}

async function main() {
  console.log(`Running full API e2e against ${API_BASE_URL}`);

  const healthz = await callApi({ method: "GET", path: "/healthz", signed: false, expectedStatus: 200 });
  expect(healthz?.json?.ok === true, "healthz should return ok=true");
  const readyz = await callApi({ method: "GET", path: "/readyz", signed: false, expectedStatus: 200 });
  expect(readyz?.json?.ready === true, "readyz should return ready=true");

  const missingAuth = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: false,
    expectedStatus: 401,
  });
  expect(extractErrorCode(missingAuth.json) === "missing_auth_headers", "missing auth headers should be rejected");

  const staleTimestamp = String(Date.now() - 10 * 60 * 1000);
  const staleAuth = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: true,
    timestamp: staleTimestamp,
    expectedStatus: 401,
  });
  expect(extractErrorCode(staleAuth.json) === "invalid_timestamp", "stale timestamp should be rejected");

  const badSignature = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: true,
    signatureOverride: "deadbeef",
    expectedStatus: 401,
  });
  expect(extractErrorCode(badSignature.json) === "invalid_signature", "invalid signature should be rejected");

  const replayTimestamp = String(Date.now());
  const replayNonce = crypto.randomUUID();
  const replayFirst = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: true,
    timestamp: replayTimestamp,
    nonce: replayNonce,
    expectedStatus: 200,
  });
  expect(Array.isArray(replayFirst?.json?.items), "first replay request should pass");
  const replaySecond = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: true,
    timestamp: replayTimestamp,
    nonce: replayNonce,
    expectedStatus: 401,
  });
  expect(extractErrorCode(replaySecond.json) === "nonce_reused", "replayed nonce should be rejected");

  const createdKeyResponse = await callApi({
    method: "POST",
    path: "/v1/keys",
    signed: true,
    body: {
      name: "ci-e2e-admin",
      scopes: ["keys:admin"],
    },
    expectedStatus: 200,
  });
  const createdKeyId = createdKeyResponse?.json?.item?.keyId;
  const createdKeySecret = createdKeyResponse?.json?.secret;
  expect(typeof createdKeyId === "string" && createdKeyId.length > 0, "created key should return keyId");
  expect(typeof createdKeySecret === "string" && createdKeySecret.length > 0, "created key should return secret");

  const listedKeys = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: true,
    expectedStatus: 200,
  });
  expect(
    Array.isArray(listedKeys?.json?.items) &&
      listedKeys.json.items.some((item) => item.keyId === createdKeyId),
    "created key should appear in key list"
  );

  const rotated = await callApi({
    method: "POST",
    path: `/v1/keys/${encodeURIComponent(createdKeyId)}/rotate`,
    signed: true,
    body: { reason: "ci-rotation" },
    expectedStatus: 200,
  });
  const rotatedSecret = rotated?.json?.secret;
  expect(typeof rotatedSecret === "string" && rotatedSecret.length > 0, "rotate key should return new secret");

  const oldSecretRejected = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: true,
    keyId: createdKeyId,
    keySecret: createdKeySecret,
    expectedStatus: 401,
  });
  expect(extractErrorCode(oldSecretRejected.json) === "invalid_signature", "old rotated secret should be invalid");

  const rotatedSecretWorks = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: true,
    keyId: createdKeyId,
    keySecret: rotatedSecret,
    expectedStatus: 200,
  });
  expect(Array.isArray(rotatedSecretWorks?.json?.items), "rotated secret should be usable");

  await callApi({
    method: "POST",
    path: `/v1/keys/${encodeURIComponent(createdKeyId)}/revoke`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });
  const revokedRejected = await callApi({
    method: "GET",
    path: "/v1/keys",
    signed: true,
    keyId: createdKeyId,
    keySecret: rotatedSecret,
    expectedStatus: 401,
  });
  expect(extractErrorCode(revokedRejected.json) === "revoked_key", "revoked key should be rejected");

  const postCreatePayload = {
    locale: "en",
    title: "CI E2E Post",
    content: "CI E2E post content for lifecycle checks.",
    tags: ["ci", "e2e"],
    status: "draft",
  };
  const postIdempotencyKey = "ci-e2e-post-create";
  const postCreate1 = await callApi({
    method: "POST",
    path: "/v1/posts",
    signed: true,
    body: postCreatePayload,
    idempotencyKey: postIdempotencyKey,
    expectedStatus: 200,
  });
  const postId = postCreate1?.json?.item?.id;
  const postSlug = postCreate1?.json?.item?.slug;
  expect(typeof postId === "string" && postId.length > 0, "post create should return id");
  expect(typeof postSlug === "string" && postSlug.length > 0, "post create should return slug");

  const postCreate2 = await callApi({
    method: "POST",
    path: "/v1/posts",
    signed: true,
    body: postCreatePayload,
    idempotencyKey: postIdempotencyKey,
    expectedStatus: 200,
  });
  expect(postCreate2?.json?.item?.id === postId, "idempotent create should return same post id");

  const postConflict = await callApi({
    method: "POST",
    path: "/v1/posts",
    signed: true,
    body: { ...postCreatePayload, title: "CI E2E Post Conflict" },
    idempotencyKey: postIdempotencyKey,
    expectedStatus: 409,
  });
  expect(extractErrorCode(postConflict.json) === "idempotency_conflict", "idempotency conflict should return 409");

  await callApi({
    method: "PATCH",
    path: `/v1/posts/${encodeURIComponent(postId)}`,
    signed: true,
    body: {
      title: "CI E2E Post Updated",
      excerpt: "ci-e2e excerpt",
      content: "CI E2E post content updated.",
    },
    idempotencyKey: "ci-e2e-post-update",
    expectedStatus: 200,
  });

  await callApi({
    method: "POST",
    path: `/v1/posts/${encodeURIComponent(postId)}/publish`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });
  await callApi({
    method: "POST",
    path: `/v1/posts/${encodeURIComponent(postId)}/unpublish`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });
  await callApi({
    method: "POST",
    path: `/v1/posts/${encodeURIComponent(postId)}/publish`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });

  const longMomentContent = `CI long moment ${"lorem ipsum dolor sit amet ".repeat(24)}`.trim();
  const momentCreate = await callApi({
    method: "POST",
    path: "/v1/moments",
    signed: true,
    body: {
      content: longMomentContent,
      locale: "en",
      visibility: "public",
      status: "draft",
      location: { name: "CI Room" },
    },
    idempotencyKey: "ci-e2e-moment-create",
    expectedStatus: 200,
  });
  const momentId = momentCreate?.json?.item?.id;
  expect(typeof momentId === "string" && momentId.length > 0, "moment create should return id");

  await callApi({
    method: "PATCH",
    path: `/v1/moments/${encodeURIComponent(momentId)}`,
    signed: true,
    body: {
      visibility: "public",
      media: [],
      status: "draft",
    },
    idempotencyKey: "ci-e2e-moment-update",
    expectedStatus: 200,
  });

  await callApi({
    method: "POST",
    path: `/v1/moments/${encodeURIComponent(momentId)}/publish`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });
  await callApi({
    method: "POST",
    path: `/v1/moments/${encodeURIComponent(momentId)}/unpublish`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });
  await callApi({
    method: "POST",
    path: `/v1/moments/${encodeURIComponent(momentId)}/publish`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });

  const galleryCreate = await callApi({
    method: "POST",
    path: "/v1/gallery-items",
    signed: true,
    body: {
      locale: "en",
      fileUrl: "https://example.com/e2e-file.jpg",
      thumbUrl: "https://example.com/e2e-thumb.jpg",
      title: "CI Gallery Draft",
      status: "draft",
    },
    idempotencyKey: "ci-e2e-gallery-create",
    expectedStatus: 200,
  });
  const galleryId = galleryCreate?.json?.item?.id;
  expect(typeof galleryId === "string" && galleryId.length > 0, "gallery create should return id");

  await callApi({
    method: "PATCH",
    path: `/v1/gallery-items/${encodeURIComponent(galleryId)}`,
    signed: true,
    body: {
      title: "CI Gallery Updated",
    },
    idempotencyKey: "ci-e2e-gallery-update",
    expectedStatus: 200,
  });

  await callApi({
    method: "POST",
    path: `/v1/gallery-items/${encodeURIComponent(galleryId)}/publish`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });

  const mediaUploadCreate = await callApi({
    method: "POST",
    path: "/v1/media/uploads",
    signed: true,
    body: {
      filename: "ci-image.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      sha256: sha256Hex("ci-media"),
    },
    idempotencyKey: "ci-e2e-media-create",
    expectedStatus: 200,
  });
  const mediaUploadId = mediaUploadCreate?.json?.uploadId;
  expect(typeof mediaUploadId === "string" && mediaUploadId.length > 0, "media upload create should return uploadId");

  const mediaComplete = await callApi({
    method: "POST",
    path: `/v1/media/uploads/${encodeURIComponent(mediaUploadId)}/complete`,
    signed: true,
    body: {
      size: 1024,
      sha256: sha256Hex("ci-media"),
      exif: {
        camera: "CI Camera",
      },
    },
    idempotencyKey: "ci-e2e-media-complete",
    expectedStatus: 200,
  });
  expect(mediaComplete?.json?.asset?.status === "uploaded", "media complete should mark status=uploaded");

  const invalidMedia = await callApi({
    method: "POST",
    path: "/v1/media/uploads",
    signed: true,
    body: {
      filename: "ci.pdf",
      mimeType: "application/pdf",
      size: 12,
      sha256: sha256Hex("ci-invalid"),
    },
    expectedStatus: 400,
  });
  expect(extractErrorCode(invalidMedia.json) === "invalid_media", "invalid media type should be rejected");

  const previewSession = await callApi({
    method: "POST",
    path: "/v1/previews/sessions",
    signed: true,
    body: {
      kind: "post",
      contentId: postId,
    },
    idempotencyKey: "ci-e2e-preview-session",
    expectedStatus: 200,
  });
  const cardPreviewUrl = previewSession?.json?.cardPreviewUrl;
  expect(typeof cardPreviewUrl === "string" && cardPreviewUrl.length > 0, "preview session should return cardPreviewUrl");

  const parsedPreview = new URL(cardPreviewUrl);
  const sid = parsedPreview.searchParams.get("sid");
  const exp = parsedPreview.searchParams.get("exp");
  const sig = parsedPreview.searchParams.get("sig");
  expect(Boolean(sid && exp && sig), "preview url should include sid/exp/sig");

  const previewPayload = await callApi({
    method: "GET",
    path: `/v1/previews/sessions/${encodeURIComponent(sid)}/payload`,
    signed: false,
    query: { exp, sig },
    expectedStatus: 200,
  });
  expect(previewPayload?.json?.payload?.kind === "post", "preview payload should return kind=post");

  const previewInvalidSig = await callApi({
    method: "GET",
    path: `/v1/previews/sessions/${encodeURIComponent(sid)}/payload`,
    signed: false,
    query: { exp, sig: "invalid" },
    expectedStatus: 401,
  });
  expect(extractErrorCode(previewInvalidSig.json) === "invalid_preview_token", "invalid preview sig should be rejected");

  const aiModels = await callApi({
    method: "GET",
    path: "/v1/ai/models",
    signed: true,
    expectedStatus: 200,
  });
  expect(Array.isArray(aiModels?.json?.items) && aiModels.json.items.length >= 1, "ai models should return providers");

  const aiJobCreate = await callApi({
    method: "POST",
    path: "/v1/ai/jobs",
    signed: true,
    body: {
      kind: "moment",
      contentId: momentId,
      provider: "openai",
      model: "gpt-4.1-mini",
      prompt: "Rewrite this moment into a concise summary.",
    },
    idempotencyKey: "ci-e2e-ai-job",
    expectedStatus: 200,
  });
  const aiJobId = aiJobCreate?.json?.job?.id;
  expect(typeof aiJobId === "string" && aiJobId.length > 0, "ai job create should return job id");

  const genericJob = await callApi({
    method: "GET",
    path: `/v1/jobs/${encodeURIComponent(aiJobId)}`,
    signed: true,
    expectedStatus: 200,
  });
  expect(genericJob?.json?.id === aiJobId, "generic job endpoint should return same job id");

  await pollAIJobUntilSucceeded(aiJobId);

  await callApi({
    method: "POST",
    path: `/v1/ai/jobs/${encodeURIComponent(aiJobId)}/apply`,
    signed: true,
    body: {},
    expectedStatus: 200,
  });

  const publicFeed = await callApi({
    method: "GET",
    path: "/v1/public/feed",
    signed: false,
    query: { locale: "en", limit: 10 },
    expectedStatus: 200,
  });
  expect(Array.isArray(publicFeed?.json?.items), "public feed should return items");

  const publicPost = await callApi({
    method: "GET",
    path: `/v1/public/posts/${encodeURIComponent(postSlug)}`,
    signed: false,
    query: { locale: "en" },
    expectedStatus: 200,
  });
  expect(publicPost?.json?.item?.id === postId, "public post detail should return created post");

  const publicMomentAfterAI = await callApi({
    method: "GET",
    path: `/v1/public/moments/${encodeURIComponent(momentId)}`,
    signed: false,
    query: { locale: "en" },
    expectedStatus: 200,
  });
  const rewrittenMomentContent = publicMomentAfterAI?.json?.item?.content;
  expect(typeof rewrittenMomentContent === "string", "public moment should have content");
  expect(
    rewrittenMomentContent !== longMomentContent,
    "AI apply should change moment content for long source text"
  );

  const publicGallery = await callApi({
    method: "GET",
    path: `/v1/public/gallery/${encodeURIComponent(galleryId)}`,
    signed: false,
    query: { locale: "en" },
    expectedStatus: 200,
  });
  expect(publicGallery?.json?.item?.id === galleryId, "public gallery detail should return created item");

  const publicSearch = await callApi({
    method: "POST",
    path: "/v1/public/search",
    signed: false,
    body: {
      section: "post",
      query: "CI",
      locale: "en",
      filters: { localeScope: "all" },
      limit: 5,
    },
    expectedStatus: 200,
  });
  expect(Array.isArray(publicSearch?.json?.items), "public search should return items");

  await callApi({
    method: "DELETE",
    path: `/v1/posts/${encodeURIComponent(postId)}`,
    signed: true,
    expectedStatus: 200,
  });
  await callApi({
    method: "DELETE",
    path: `/v1/moments/${encodeURIComponent(momentId)}`,
    signed: true,
    expectedStatus: 200,
  });
  await callApi({
    method: "DELETE",
    path: `/v1/gallery-items/${encodeURIComponent(galleryId)}`,
    signed: true,
    expectedStatus: 200,
  });

  await callApi({
    method: "GET",
    path: `/v1/public/posts/${encodeURIComponent(postSlug)}`,
    signed: false,
    query: { locale: "en" },
    expectedStatus: 404,
  });
  await callApi({
    method: "GET",
    path: `/v1/public/moments/${encodeURIComponent(momentId)}`,
    signed: false,
    query: { locale: "en" },
    expectedStatus: 404,
  });
  await callApi({
    method: "GET",
    path: `/v1/public/gallery/${encodeURIComponent(galleryId)}`,
    signed: false,
    query: { locale: "en" },
    expectedStatus: 404,
  });

  console.log("full API e2e checks passed");
}

main().catch((error) => {
  console.error("full API e2e failed:", error);
  process.exitCode = 1;
});
