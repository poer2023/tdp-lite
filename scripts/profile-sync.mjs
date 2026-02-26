#!/usr/bin/env node

import { createHash, createHmac, randomUUID } from "node:crypto";

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw || !raw.startsWith("--")) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = next;
    i += 1;
  }
  return result;
}

function asBoolean(value, fallback = false) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function asInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalQuery(rawQuery) {
  if (!rawQuery) return "";
  return rawQuery
    .split("&")
    .filter(Boolean)
    .sort()
    .join("&");
}

function buildSignature({
  keySecret,
  method,
  path,
  query,
  timestamp,
  nonce,
  bodyHash,
}) {
  const canonical = [
    method.toUpperCase(),
    path,
    canonicalQuery(query),
    timestamp,
    nonce,
    bodyHash.toLowerCase(),
  ].join("\n");

  return createHmac("sha256", keySecret).update(canonical).digest("hex");
}

function dayKeyUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeUtcDayStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizeHeatmapLevels(counts) {
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

function normalizeArtworkUrl(template, width = 240, height = 240) {
  if (!template || typeof template !== "string") return null;
  return template.replaceAll("{w}", String(width)).replaceAll("{h}", String(height));
}

function buildRatios({ github, music }) {
  const githubCommits = github?.totalCommits ?? 0;
  const musicDurationMs = (music?.recentTracks || []).reduce((sum, track) => {
    const duration = Number.isFinite(track.durationMs) ? track.durationMs : 0;
    return sum + Math.max(duration, 0);
  }, 0);
  const uniqueArtists = new Set((music?.recentTracks || []).map((track) => track.artist)).size;

  const rawValues = [
    { key: "code", label: "Code", value: Math.max(githubCommits, 1) },
    { key: "listen", label: "Listen", value: Math.max(Math.round(musicDurationMs / 60000), 1) },
    { key: "explore", label: "Explore", value: Math.max(uniqueArtists, 1) },
  ];
  const total = rawValues.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return [
      { key: "code", label: "Code", value: 34 },
      { key: "listen", label: "Listen", value: 33 },
      { key: "explore", label: "Explore", value: 33 },
    ];
  }

  let used = 0;
  const withPercent = rawValues.map((item, index) => {
    if (index === rawValues.length - 1) {
      return { ...item, value: Math.max(0, 100 - used) };
    }
    const percent = Math.floor((item.value / total) * 100);
    used += percent;
    return { ...item, value: percent };
  });

  return withPercent;
}

async function fetchJSON(url, { headers = {}, timeoutMs = 20000 } = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`request failed ${response.status}: ${url}; body=${text.slice(0, 240)}`);
  }
  return body;
}

async function fetchGithubSnapshot(config) {
  const username = config.githubUsername?.trim();
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
  const startDay = new Date(endDay.getTime() - (windowDays - 1) * 24 * 3600 * 1000);
  const startTs = startDay.getTime();
  const countsByDay = new Map();
  const recentPushes = [];
  let totalPushEvents = 0;
  let totalCommits = 0;

  for (let page = 1; page <= config.githubMaxPages; page += 1) {
    const url = `${config.githubApiBase.replace(/\/$/, "")}/users/${encodeURIComponent(username)}/events/public?per_page=100&page=${page}`;
    const headers = {
      "User-Agent": "tdp-lite-profile-sync",
      ...(config.githubToken ? { Authorization: `Bearer ${config.githubToken}` } : {}),
      ...(config.githubToken ? { "X-GitHub-Api-Version": "2022-11-28" } : {}),
    };
    const list = await fetchJSON(url, { headers, timeoutMs: config.timeoutMs });
    if (!Array.isArray(list) || list.length === 0) {
      break;
    }

    let reachedBeforeWindow = false;
    for (const event of list) {
      if (!event || typeof event !== "object") continue;
      if (event.type !== "PushEvent") continue;

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

  const counts = [];
  for (let i = 0; i < windowDays; i += 1) {
    const day = new Date(startDay.getTime() + i * 24 * 3600 * 1000);
    counts.push(countsByDay.get(dayKeyUTC(day)) || 0);
  }

  const levels = normalizeHeatmapLevels(counts);
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

async function fetchAppleMusicSnapshot(config) {
  const developerToken = config.appleMusicDeveloperToken?.trim();
  const userToken = config.appleMusicUserToken?.trim();
  if (!developerToken || !userToken) {
    return {
      ok: false,
      skipped: true,
      error: "APPLE_MUSIC_DEVELOPER_TOKEN or APPLE_MUSIC_USER_TOKEN missing",
      payload: null,
    };
  }

  const endpoint = `${config.appleMusicApiBase.replace(/\/$/, "")}/me/recent/played/tracks?limit=${config.appleMusicLimit}`;
  const body = await fetchJSON(endpoint, {
    timeoutMs: config.timeoutMs,
    headers: {
      Authorization: `Bearer ${developerToken}`,
      "Music-User-Token": userToken,
      Origin: "https://music.apple.com",
    },
  });

  const tracksRaw = Array.isArray(body?.data) ? body.data : [];
  const tracks = tracksRaw
    .map((item) => {
      const attrs = item?.attributes || {};
      return {
        id: typeof item?.id === "string" ? item.id : null,
        name: typeof attrs.name === "string" ? attrs.name : "",
        artist: typeof attrs.artistName === "string" ? attrs.artistName : "",
        album: typeof attrs.albumName === "string" ? attrs.albumName : null,
        durationMs:
          typeof attrs.durationInMillis === "number" ? attrs.durationInMillis : null,
        url: typeof attrs.url === "string" ? attrs.url : null,
        artworkUrl: normalizeArtworkUrl(attrs.artwork?.url),
      };
    })
    .filter((track) => track.name && track.artist);

  const artistCounter = new Map();
  for (const track of tracks) {
    artistCounter.set(track.artist, (artistCounter.get(track.artist) || 0) + 1);
  }
  const topArtists = Array.from(artistCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    ok: true,
    skipped: false,
    error: null,
    payload: {
      provider: "apple-music",
      storefront: config.appleMusicStorefront,
      fetchedAt: new Date().toISOString(),
      recentTracks: tracks.slice(0, 10),
      topArtists,
    },
  };
}

async function postSnapshot(config, body) {
  const path = "/v1/internal/profile-snapshot";
  const method = "POST";
  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  const raw = JSON.stringify(body);
  const bodyHash = sha256Hex(raw);
  const signature = buildSignature({
    keySecret: config.internalKeySecret,
    method,
    path,
    query: "",
    timestamp,
    nonce,
    bodyHash,
  });

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-TDP-Key-Id": config.internalKeyID,
      "X-TDP-Timestamp": timestamp,
      "X-TDP-Nonce": nonce,
      "X-TDP-Signature": signature,
    },
    body: raw,
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`snapshot upsert failed (${response.status}): ${text.slice(0, 320)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function runOnce(config) {
  const githubResult = await fetchGithubSnapshot(config).catch((error) => ({
    ok: false,
    skipped: false,
    error: error instanceof Error ? error.message : String(error),
    payload: null,
  }));
  const musicResult = await fetchAppleMusicSnapshot(config).catch((error) => ({
    ok: false,
    skipped: false,
    error: error instanceof Error ? error.message : String(error),
    payload: null,
  }));

  const successCount = Number(githubResult.ok) + Number(musicResult.ok);
  const sourceStatus = {
    generatedAt: new Date().toISOString(),
    github: {
      ok: githubResult.ok,
      skipped: githubResult.skipped,
      error: githubResult.error || null,
    },
    music: {
      ok: musicResult.ok,
      skipped: musicResult.skipped,
      error: musicResult.error || null,
    },
  };

  const payload = {
    sourceStatus,
  };

  if (githubResult.ok && githubResult.payload) {
    payload.github = githubResult.payload;
  }
  if (musicResult.ok && musicResult.payload) {
    payload.music = musicResult.payload;
  }
  if (successCount > 0) {
    payload.derived = {
      generatedAt: new Date().toISOString(),
      ratios: buildRatios({
        github: githubResult.payload,
        music: musicResult.payload,
      }),
    };
    payload.syncedAt = new Date().toISOString();
  }

  await postSnapshot(config, payload);
  return { successCount, sourceStatus };
}

function buildConfig(args) {
  const intervalHours = asInt(
    args["interval-hours"] ?? process.env.PROFILE_SYNC_INTERVAL_HOURS,
    24
  );
  return {
    loop: asBoolean(args.loop, false),
    intervalHours: Math.max(1, intervalHours),
    timeoutMs: Math.max(2000, asInt(process.env.PROFILE_SYNC_TIMEOUT_MS, 20000)),
    apiBaseUrl: (
      process.env.TDP_API_BASE_URL ||
      process.env.NEXT_PUBLIC_TDP_API_BASE_URL ||
      "http://127.0.0.1:8080"
    ).replace(/\/$/, ""),
    internalKeyID: process.env.TDP_INTERNAL_KEY_ID || "",
    internalKeySecret: process.env.TDP_INTERNAL_KEY_SECRET || "",
    githubApiBase: process.env.GITHUB_SYNC_API_BASE || "https://api.github.com",
    githubUsername: process.env.GITHUB_SYNC_USERNAME || "",
    githubToken: process.env.GITHUB_SYNC_TOKEN || "",
    githubWindowDays: Math.max(7, asInt(process.env.GITHUB_SYNC_WINDOW_DAYS, 36)),
    githubMaxPages: Math.max(1, asInt(process.env.GITHUB_SYNC_MAX_PAGES, 4)),
    appleMusicApiBase: process.env.APPLE_MUSIC_API_BASE || "https://api.music.apple.com/v1",
    appleMusicDeveloperToken: process.env.APPLE_MUSIC_DEVELOPER_TOKEN || "",
    appleMusicUserToken: process.env.APPLE_MUSIC_USER_TOKEN || "",
    appleMusicStorefront: process.env.APPLE_MUSIC_STOREFRONT || "us",
    appleMusicLimit: Math.min(100, Math.max(1, asInt(process.env.APPLE_MUSIC_SYNC_LIMIT, 25))),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = buildConfig(args);
  if (!config.internalKeyID || !config.internalKeySecret) {
    throw new Error("Missing TDP_INTERNAL_KEY_ID or TDP_INTERNAL_KEY_SECRET.");
  }

  const run = async () => {
    const startedAt = new Date().toISOString();
    try {
      const result = await runOnce(config);
      console.log(
        JSON.stringify(
          {
            ok: true,
            startedAt,
            finishedAt: new Date().toISOString(),
            successCount: result.successCount,
            sourceStatus: result.sourceStatus,
          },
          null,
          2
        )
      );
      if (result.successCount === 0) {
        throw new Error("No source updated successfully.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[profile-sync] ${message}`);
      throw error;
    }
  };

  if (!config.loop) {
    await run();
    return;
  }

  while (true) {
    try {
      await run();
    } catch {
      // Keep loop alive; status already logged above.
    }
    await sleep(config.intervalHours * 60 * 60 * 1000);
  }
}

main().catch(() => {
  process.exit(1);
});
