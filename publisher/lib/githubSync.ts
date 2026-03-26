type GithubSyncConfig = {
  timeoutMs: number;
  githubApiBase: string;
  githubHtmlBase: string;
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

type GithubContributionDay = {
  date: string;
  count: number;
  level: number;
};

type GithubPushSummary = {
  recentPushes: GithubSnapshotPayload["recentPushes"];
  totalPushEvents: number;
};

type GithubGraphqlCalendarDay = {
  date?: unknown;
  contributionCount?: unknown;
};

type GithubGraphqlWeek = {
  contributionDays?: unknown;
};

type GithubGraphqlResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: unknown;
        } | null;
      } | null;
    } | null;
  } | null;
  errors?: Array<{ message?: unknown }> | null;
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

async function fetchText(
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
    headers,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `request failed ${response.status}: ${url}; body=${text.slice(0, 240)}`
    );
  }

  return text;
}

async function fetchContributionWindowFromGraphql(
  username: string,
  startDay: Date,
  endDay: Date,
  config: GithubSyncConfig
) {
  if (!config.githubToken.trim()) {
    return null;
  }

  const response = await fetch(
    `${config.githubApiBase.replace(/\/$/, "")}/graphql`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.githubToken}`,
        "User-Agent": "tdp-publisher-profile-sync",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        query: `
        query ContributionWindow($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }
      `,
        variables: {
          login: username,
          from: startDay.toISOString(),
          to: new Date(
            endDay.getTime() + 24 * 60 * 60 * 1000 - 1
          ).toISOString(),
        },
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: "no-store",
    }
  );

  const text = await response.text();
  const body = text ? (JSON.parse(text) as GithubGraphqlResponse) : {};
  if (!response.ok) {
    throw new Error(
      `request failed ${response.status}: github graphql; body=${text.slice(0, 240)}`
    );
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const message = body.errors
      .map((error) => String(error?.message || "unknown graphql error"))
      .join("; ");
    throw new Error(`github graphql error: ${message}`);
  }

  const weeks =
    body.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!Array.isArray(weeks)) {
    return null;
  }

  const countsByDate = new Map<string, number>();
  for (const week of weeks as GithubGraphqlWeek[]) {
    const days = Array.isArray(week?.contributionDays)
      ? (week.contributionDays as GithubGraphqlCalendarDay[])
      : [];
    for (const day of days) {
      const date = typeof day?.date === "string" ? day.date : "";
      const count =
        typeof day?.contributionCount === "number" ? day.contributionCount : 0;
      if (!date) continue;
      countsByDate.set(date, Math.max(0, count));
    }
  }

  const counts: number[] = [];
  for (let index = 0; index < config.githubWindowDays; index += 1) {
    const day = new Date(startDay.getTime() + index * 24 * 60 * 60 * 1000);
    counts.push(countsByDate.get(dayKeyUTC(day)) || 0);
  }

  return {
    counts,
    levels: normalizeHeatmapLevels(counts),
  };
}

function parseContributionCount(label: string) {
  const normalized = label.trim();
  if (!normalized || /^No contributions\b/i.test(normalized)) {
    return 0;
  }

  const match = normalized.match(/^(\d+)\s+contribution/i);
  if (!match) {
    return 0;
  }

  return Number.parseInt(match[1] || "0", 10) || 0;
}

function parseContributionLevel(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 4) return 4;
  return parsed;
}

function parseContributionCalendar(html: string): GithubContributionDay[] {
  const days: GithubContributionDay[] = [];
  const cellPattern =
    /(<td\b[^>]*\bclass="ContributionCalendar-day"[^>]*><\/td>)\s*<tool-tip\b[^>]*>([^<]+)<\/tool-tip>/g;

  for (const match of html.matchAll(cellPattern)) {
    const cellMarkup = match[1] || "";
    const tooltip = match[2] || "";
    const dateMatch = cellMarkup.match(/\bdata-date="([^"]+)"/);
    const levelMatch = cellMarkup.match(/\bdata-level="([^"]+)"/);
    const date = dateMatch?.[1]?.trim();

    if (!date) continue;

    days.push({
      date,
      count: parseContributionCount(tooltip),
      level: parseContributionLevel(levelMatch?.[1] || "0"),
    });
  }

  return days;
}

async function fetchContributionDaysForYear(
  username: string,
  year: number,
  config: GithubSyncConfig
) {
  const base = config.githubHtmlBase.replace(/\/$/, "");
  const html = await fetchText(
    `${base}/users/${encodeURIComponent(username)}/contributions?from=${year}-01-01&to=${year}-12-31`,
    {
      timeoutMs: config.timeoutMs,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "tdp-publisher-profile-sync",
      },
    }
  );

  return parseContributionCalendar(html);
}

async function fetchContributionWindow(
  username: string,
  startDay: Date,
  endDay: Date,
  config: GithubSyncConfig
) {
  const graphqlWindow = await fetchContributionWindowFromGraphql(
    username,
    startDay,
    endDay,
    config
  ).catch(() => null);
  if (graphqlWindow) {
    return graphqlWindow;
  }

  const dates = new Map<string, GithubContributionDay>();
  const years = new Set<number>();
  for (
    let cursor = startDay.getUTCFullYear();
    cursor <= endDay.getUTCFullYear();
    cursor += 1
  ) {
    years.add(cursor);
  }

  for (const year of years) {
    const days = await fetchContributionDaysForYear(username, year, config);
    for (const day of days) {
      dates.set(day.date, day);
    }
  }

  const counts: number[] = [];
  const levels: number[] = [];
  for (let index = 0; index < config.githubWindowDays; index += 1) {
    const day = new Date(startDay.getTime() + index * 24 * 60 * 60 * 1000);
    const entry = dates.get(dayKeyUTC(day));
    counts.push(entry?.count ?? 0);
    levels.push(entry?.level ?? 0);
  }

  return { counts, levels };
}

async function fetchRecentPushSummary(
  config: GithubSyncConfig,
  username: string,
  startTs: number
): Promise<GithubPushSummary> {
  const recentPushes: GithubSnapshotPayload["recentPushes"] = [];
  let totalPushEvents = 0;

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

      totalPushEvents += 1;

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

  return { recentPushes, totalPushEvents };
}

export function buildGithubSyncConfigFromEnv(): GithubSyncConfig {
  return {
    timeoutMs: Math.max(
      2_000,
      asInt(process.env.PROFILE_SYNC_TIMEOUT_MS, 20_000)
    ),
    githubApiBase: process.env.GITHUB_SYNC_API_BASE || "https://api.github.com",
    githubHtmlBase: process.env.GITHUB_SYNC_HTML_BASE || "https://github.com",
    githubUsername: process.env.GITHUB_SYNC_USERNAME || "",
    githubToken: process.env.GITHUB_SYNC_TOKEN || "",
    githubWindowDays: Math.max(
      7,
      Math.min(56, asInt(process.env.GITHUB_SYNC_WINDOW_DAYS, 56))
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
  let counts: number[] = [];
  let levels: number[] = [];
  try {
    const contributionWindow = await fetchContributionWindow(
      username,
      startDay,
      endDay,
      config
    );
    counts = contributionWindow.counts;
    levels = contributionWindow.levels;
  } catch {
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
      }

      if (reachedBeforeWindow) {
        break;
      }
    }

    counts = [];
    for (let index = 0; index < windowDays; index += 1) {
      const day = new Date(startDay.getTime() + index * 24 * 60 * 60 * 1000);
      counts.push(countsByDay.get(dayKeyUTC(day)) || 0);
    }
    levels = normalizeHeatmapLevels(counts);
  }

  const { recentPushes, totalPushEvents } = await fetchRecentPushSummary(
    config,
    username,
    startTs
  );
  const totalCommits = counts.reduce((sum, count) => sum + count, 0);

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
        levels,
      },
      recentPushes,
    },
  };
}
