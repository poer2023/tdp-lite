import { NextResponse } from "next/server";
import { requirePublisherApiAuth } from "@/lib/auth";
import {
  buildGithubSyncConfigFromEnv,
  fetchGithubSnapshot,
} from "@/lib/githubSync";
import {
  getProfileSnapshotFromSite,
  SiteClientError,
  upsertProfileSnapshotOnSite,
} from "@/lib/siteClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function buildDerivedRatios(params: {
  github: Record<string, unknown> | null;
  music: Record<string, unknown> | null;
  generatedAt: string;
}) {
  const githubCommits = asNumber(params.github?.totalCommits) ?? 0;
  const recentTracks = asArray(params.music?.recentTracks);
  const musicDurationMs = recentTracks.reduce<number>(
    (sum, trackRaw) => {
      const track = asObject(trackRaw);
      const duration = asNumber(track.durationMs) ?? 0;
      return sum + Math.max(duration, 0);
    },
    0
  );
  const uniqueArtists = new Set(
    recentTracks
      .map((trackRaw) => asString(asObject(trackRaw).artist))
      .filter(Boolean)
  ).size;

  const rawValues = [
    { key: "code", label: "Code", value: Math.max(githubCommits, 1) },
    {
      key: "listen",
      label: "Listen",
      value: Math.max(Math.round(musicDurationMs / 60000), 1),
    },
    { key: "explore", label: "Explore", value: Math.max(uniqueArtists, 1) },
  ];
  const total = rawValues.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return {
      generatedAt: params.generatedAt,
      ratios: [
        { key: "code", label: "Code", value: 34 },
        { key: "listen", label: "Listen", value: 33 },
        { key: "explore", label: "Explore", value: 33 },
      ],
    };
  }

  let used = 0;
  const ratios = rawValues.map((item, index) => {
    if (index === rawValues.length - 1) {
      return { ...item, value: Math.max(0, 100 - used) };
    }
    const percent = Math.floor((item.value / total) * 100);
    used += percent;
    return { ...item, value: percent };
  });

  return {
    generatedAt: params.generatedAt,
    ratios,
  };
}

function mergeSourceStatus(params: {
  current: Record<string, unknown> | null;
  githubError: string | null;
  generatedAt: string;
}) {
  return {
    ...(params.current ?? {}),
    generatedAt: params.generatedAt,
    github: {
      ok: params.githubError === null,
      skipped: false,
      error: params.githubError,
    },
  };
}

export async function POST() {
  const authError = await requirePublisherApiAuth();
  if (authError) {
    return authError;
  }

  try {
    const githubResult = await fetchGithubSnapshot(buildGithubSyncConfigFromEnv());

    if (githubResult.skipped) {
      return NextResponse.json(
        {
          error: githubResult.error || "GitHub sync skipped",
        },
        { status: 400 }
      );
    }

    if (!githubResult.ok || !githubResult.payload) {
      return NextResponse.json(
        {
          error: githubResult.error || "GitHub sync failed",
        },
        { status: 502 }
      );
    }

    const currentSnapshot = await getProfileSnapshotFromSite();
    const generatedAt = new Date().toISOString();
    const nextDerived = buildDerivedRatios({
      github: githubResult.payload as unknown as Record<string, unknown>,
      music: currentSnapshot.music,
      generatedAt,
    });
    const nextSourceStatus = mergeSourceStatus({
      current: currentSnapshot.sourceStatus,
      githubError: githubResult.error,
      generatedAt,
    });

    const item = await upsertProfileSnapshotOnSite({
      github: githubResult.payload as unknown as Record<string, unknown>,
      derived: nextDerived,
      sourceStatus: nextSourceStatus,
      syncedAt: generatedAt,
    });

    return NextResponse.json({
      ok: true,
      item,
      message: "GitHub Pulse 已刷新，about 页通常会在 1 分钟内看到更新。",
    });
  } catch (error) {
    if (error instanceof SiteClientError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "github pulse refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
