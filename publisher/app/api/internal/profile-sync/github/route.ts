import { NextResponse } from "next/server";
import { requirePublisherApiOrCronAuth } from "@/lib/auth";
import {
  buildGithubSyncConfigFromEnv,
  fetchGithubSnapshot,
} from "@/lib/githubSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requirePublisherApiOrCronAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const result = await fetchGithubSnapshot(buildGithubSyncConfigFromEnv());
    return NextResponse.json(result, {
      status: result.ok || result.skipped ? 200 : 502,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "github profile sync failed";
    return NextResponse.json(
      {
        ok: false,
        skipped: false,
        error: message,
        payload: null,
      },
      { status: 500 }
    );
  }
}
