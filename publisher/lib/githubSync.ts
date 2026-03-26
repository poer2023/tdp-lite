type GithubSyncConfig = {
  timeoutMs: number;
  githubApiBase: string;
  githubUsername: string;
  githubToken: string;
  githubWindowDays: number;
  githubMaxPages: number;
};

type GithubPushEvent = {
  type?: unknown;
  created_at?: unknown;
  repo?: {
    name?: unknown;
  } | null;
  payload?: {
    commits?: unknown;
  } | null;
};

type GithubSnapshotPayload = {
  provider: "github";
  username: string;
  fetchedAt: string;
  windowDays: number;
  totalPushEvents: number;
  totalCommits: number;
  heatmap: {
    startDate: string;
    endDate: string;
    counts: number[];
    levels: number[];
  };
  recentPushes: Array<{
    repo: string;
    commitCount: number;
    createdAt: string;
  }>;
};

export type GithubSnapshotResult = {
  ok: boolean;
  skipped: boolean;
  error: string | null;
  payload: GithubSnapshotPayload | null;
};

function asInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dayKeyUTC(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeUtcDayStart(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function normalizeHeatmapLevels(counts: number[]) {
  const max = counts.reduce((acc, value) => Math.max(acc, value), 0);
  if (max <= 0) {
    return counts.map(() => 0);
  }

  return counts.map((value) => {
    if (value <= 0) return 0;
    const ratio = value / max;
    const level = Math.ceil(ratio * 4);
    if (level < 1) return 1;
    if (level > 4) return 4;
    return level;
  });
}

async function fetchJSON(
  url: string,
  {
    headers = {},
    timeoutMs = 20_000,
  }: {
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {}
) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    throw new Error(
      `request failed ${response.status}: ${url}; body=${text.slice(0, 240)}`
    );
  }
  return body;
}

export function buildGithubSyncConfigFromEnv(): GithubSyncConfig {
  return {
    timeoutMs: Math.max(
      2_000,
      asInt(process.env.PROFILE_SYNC_TIMEOUT_MS, 20_000)
    ),
    githubApiBase: process.env.GITHUB_SYNC_API_BASE || "https://api.github.com",
    githubUsername: process.env.GITHUB_SYNC_USERNAME || "",
    githubToken: process.env.GITHUB_SYNC_TOKEN || "",
    githubWindowDays: Math.max(
      7,
      asInt(process.env.GITHUB_SYNC_WINDOW_DAYS, 36)
    ),
    githubMaxPages: Math.max(1, asInt(process.env.GITHUB_SYNC_MAX_PAGES, 4)),
  };
}

export async function fetchGithubSnapshot(
  config: GithubSyncConfig
): Promise<GithubSnapshotResult> {
  const username = config.githubUsername.trim();
  if (!username) {
    return {
      ok: false,
      skipped: true,
      error: "GITHUB_SYNC_USERNAME is empty",
      payload: null,
    };
  }

  const now = new Date();
  const windowDays = config.githubWindowDays;
  const endDay = makeUtcDayStart(now);
  const startDay = new Date(
    endDay.getTime() - (windowDays - 1) * 24 * 60 * 60 * 1000
  );
  const startTs = startDay.getTime();
  const countsByDay = new Map<string, number>();
  const recentPushes: GithubSnapshotPayload["recentPushes"] = [];
  let totalPushEvents = 0;
  let totalCommits = 0;

  for (let page = 1; page <= config.githubMaxPages; page += 1) {
    const url = `${config.githubApiBase.replace(/\/$/, "")}/users/${encodeURIComponent(username)}/events/public?per_page=100&page=${page}`;
    const headers = {
      "User-Agent": "tdp-publisher-profile-sync",
      ...(config.githubToken
        ? { Authorization: `Bearer ${config.githubToken}` }
        : {}),
      ...(config.githubToken ? { "X-GitHub-Api-Version": "2022-11-28" } : {}),
    };
    const list = await fetchJSON(url, {
      headers,
      timeoutMs: config.timeoutMs,
    });

    if (!Array.isArray(list) || list.length === 0) {
      break;
    }

    let reachedBeforeWindow = false;
    for (const item of list) {
      const event = item as GithubPushEvent;
      if (event?.type !== "PushEvent") continue;

      const createdAt = new Date(String(event.created_at || ""));
      if (!Number.isFinite(createdAt.getTime())) continue;
      if (createdAt.getTime() < startTs) {
        reachedBeforeWindow = true;
        continue;
      }

      const payloadCommits = Array.isArray(event.payload?.commits)
        ? event.payload.commits.length
        : 0;
      const commitCount = Math.max(payloadCommits, 1);
      const day = dayKeyUTC(createdAt);

      countsByDay.set(day, (countsByDay.get(day) || 0) + commitCount);
      totalPushEvents += 1;
      totalCommits += commitCount;

      if (recentPushes.length < 8) {
        recentPushes.push({
          repo: String(event.repo?.name || ""),
          commitCount,
          createdAt: createdAt.toISOString(),
        });
      }
    }

    if (reachedBeforeWindow) {
      break;
    }
  }

  const counts: number[] = [];
  for (let index = 0; index < windowDays; index += 1) {
    const day = new Date(startDay.getTime() + index * 24 * 60 * 60 * 1000);
    counts.push(countsByDay.get(dayKeyUTC(day)) || 0);
  }

  return {
    ok: true,
    skipped: false,
    error: null,
    payload: {
      provider: "github",
      username,
      fetchedAt: new Date().toISOString(),
      windowDays,
      totalPushEvents,
      totalCommits,
      heatmap: {
        startDate: startDay.toISOString(),
        endDate: endDay.toISOString(),
        counts,
        levels: normalizeHeatmapLevels(counts),
      },
      recentPushes,
    },
  };
}
