import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { previewSessions } from "@/lib/schema";
import type { PreviewDraftPayload } from "./contracts";

export const PREVIEW_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export async function upsertPreviewSession(params: {
  sessionId?: string;
  payload: PreviewDraftPayload;
  now?: Date;
  ttlMs?: number;
}) {
  const now = params.now ?? new Date();
  const expiresAt = new Date(now.getTime() + (params.ttlMs ?? PREVIEW_SESSION_TTL_MS));

  if (params.sessionId) {
    const [updated] = await db
      .update(previewSessions)
      .set({
        payload: params.payload,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(previewSessions.id, params.sessionId))
      .returning();

    if (updated) {
      return updated;
    }
  }

  const [created] = await db
    .insert(previewSessions)
    .values({
      payload: params.payload,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function getPreviewSessionById(sessionId: string) {
  const [record] = await db
    .select()
    .from(previewSessions)
    .where(eq(previewSessions.id, sessionId))
    .limit(1);
  return record ?? null;
}
