import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { publishIdempotencyKeys } from "@/lib/schema";
import { publishResultSchema } from "./contracts";

export type StoredPublishResult = {
  kind: "moment" | "post" | "gallery";
  id: string;
  url: string;
  publishedAt: string;
};

type IdempotencyRow = {
  requestHash: string;
  response: Record<string, unknown>;
};

async function getRow(key: string): Promise<IdempotencyRow | null> {
  const [record] = await db
    .select({
      requestHash: publishIdempotencyKeys.requestHash,
      response: publishIdempotencyKeys.response,
    })
    .from(publishIdempotencyKeys)
    .where(eq(publishIdempotencyKeys.key, key))
    .limit(1);

  if (!record) return null;
  return {
    requestHash: record.requestHash,
    response: record.response,
  };
}

export async function beginIdempotentPublish(params: {
  key: string;
  requestHash: string;
}): Promise<
  | { status: "owner" }
  | { status: "existing"; requestHash: string; result: StoredPublishResult | null }
> {
  const inserted = await db
    .insert(publishIdempotencyKeys)
    .values({
      key: params.key,
      requestHash: params.requestHash,
      response: {},
    })
    .onConflictDoNothing()
    .returning({ key: publishIdempotencyKeys.key });

  if (inserted.length > 0) {
    return { status: "owner" };
  }

  const row = await getRow(params.key);
  if (!row) {
    // Very unlikely race: row removed between insert/select. Caller can retry.
    return { status: "existing", requestHash: params.requestHash, result: null };
  }

  const parsed = publishResultSchema.safeParse(row.response);
  return {
    status: "existing",
    requestHash: row.requestHash,
    result: parsed.success ? parsed.data : null,
  };
}

export async function finalizeIdempotentPublish(params: {
  key: string;
  requestHash: string;
  result: StoredPublishResult;
}) {
  await db
    .update(publishIdempotencyKeys)
    .set({
      response: params.result,
    })
    .where(
      and(
        eq(publishIdempotencyKeys.key, params.key),
        eq(publishIdempotencyKeys.requestHash, params.requestHash)
      )
    );
}

export async function discardIdempotentPublish(params: {
  key: string;
  requestHash: string;
}) {
  await db
    .delete(publishIdempotencyKeys)
    .where(
      and(
        eq(publishIdempotencyKeys.key, params.key),
        eq(publishIdempotencyKeys.requestHash, params.requestHash)
      )
    );
}
