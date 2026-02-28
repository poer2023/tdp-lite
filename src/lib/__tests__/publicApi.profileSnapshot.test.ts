import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchPublicProfileSnapshot } from "../publicApi";

const profileSnapshotFile = path.join(process.cwd(), "data", "profile-snapshot.json");

let originalSnapshotFile: string | null = null;

beforeEach(async () => {
  vi.restoreAllMocks();
  try {
    originalSnapshotFile = await readFile(profileSnapshotFile, "utf8");
  } catch {
    originalSnapshotFile = null;
  }
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (originalSnapshotFile === null) {
    await rm(profileSnapshotFile, { force: true });
    return;
  }
  await mkdir(path.dirname(profileSnapshotFile), { recursive: true });
  await writeFile(profileSnapshotFile, originalSnapshotFile, "utf8");
});

describe("fetchPublicProfileSnapshot", () => {
  it("falls back to the local profile snapshot file when the public API is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );

    await mkdir(path.dirname(profileSnapshotFile), { recursive: true });
    await writeFile(
      profileSnapshotFile,
      JSON.stringify(
        {
          github: {
            username: "octocat",
            windowDays: 30,
            totalCommits: 42,
            totalPushEvents: 7,
            heatmap: {
              levels: [0, 1, 2, 3, 4],
              counts: [0, 2, 4, 6, 8],
            },
            fetchedAt: "2026-02-28T00:00:00.000Z",
          },
          music: {
            provider: "apple-music",
            storefront: "us",
            recentTracks: [
              {
                id: "track-1",
                name: "Blue Hour",
                artist: "Example Artist",
                album: "Mock Album",
                artworkUrl: "https://example.com/artwork.jpg",
                durationMs: 123000,
                url: "https://music.apple.com/mock",
              },
            ],
            fetchedAt: "2026-02-28T00:00:00.000Z",
          },
          derived: {
            ratios: [{ key: "code", label: "Code", value: 60 }],
          },
          sourceStatus: {
            generatedAt: "2026-02-28T00:00:00.000Z",
          },
          syncedAt: "2026-02-28T00:00:00.000Z",
          updatedAt: "2026-02-28T00:05:00.000Z",
        },
        null,
        2
      ),
      "utf8"
    );

    const snapshot = await fetchPublicProfileSnapshot();

    expect(snapshot?.github?.username).toBe("octocat");
    expect(snapshot?.github?.heatmapLevels).toEqual([0, 1, 2, 3, 4]);
    expect(snapshot?.music?.recentTracks[0]?.name).toBe("Blue Hour");
    expect(snapshot?.syncedAt?.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});
