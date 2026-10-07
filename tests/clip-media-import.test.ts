import { describe, expect, it } from "vitest";
import { rewriteKickMediaPlaylist } from "../src/lib/hls-playlist";

const mediaImportModule = await import("../src/lib/clip-media-import").catch(() => null);

const metadata = {
  clipId: "clip_01M46K06Z01GDT3T87F3E4B7EG",
  title: "Errando tudo",
  channelName: "Aninha_gameplay_trynda",
  durationSeconds: 26,
  playlistUrl: "https://clips.kick.com/clips/11/clip_01M46K06Z01GDT3T87F3E4B7EG/playlist.m3u8",
  thumbnailUrl: "https://clips.kick.com/clips/11/clip_01M46K06Z01GDT3T87F3E4B7EG/thumbnail.webp",
  viewCount: 35,
  createdAt: null,
};

const manifest = "#EXTM3U\n#EXTINF:2.0,\n178.ts\n#EXT-X-ENDLIST";

function dependencies(options: { failOnKey?: string; failCleanup?: boolean; failMarkFailed?: boolean } = {}) {
  const calls: string[] = [];
  let recordedFailure = "";
  const deps = {
    fetchPlaylist: async () => manifest,
    fetchResource: async (url: string) => ({
      body: new Uint8Array([1, 2, 3]),
      contentType: url.endsWith(".webp") ? "image/webp" : "video/mp2t",
    }),
    rewritePlaylist: rewriteKickMediaPlaylist,
    putObject: async ({ key }: { key: string }) => {
      calls.push(`put:${key}`);
      if (key === options.failOnKey) throw new Error("upload failure");
    },
    cleanup: async () => {
      calls.push("cleanup");
      if (options.failCleanup) throw new Error("cleanup failure");
    },
    publish: async () => { calls.push("publish"); },
    markFailed: async (reason: string) => {
      calls.push("failed");
      recordedFailure = reason;
      if (options.failMarkFailed) throw new Error("database failure");
    },
  };
  return { calls, deps, recordedFailure: () => recordedFailure };
}

describe("Kick clip media import pipeline", () => {
  it("exposes an injectable media import pipeline", () => {
    expect(mediaImportModule).not.toBeNull();
  });

  it("publishes only after media, thumbnail, and rewritten playlist are stored", async () => {
    const { calls, deps } = dependencies();
    await mediaImportModule?.importKickMediaPackage(metadata, "clips/test-id", deps);

    expect(calls.filter((call) => call.startsWith("put:"))).toHaveLength(3);
    expect(calls.at(-1)).toBe("publish");
    expect(calls).not.toContain("cleanup");
    expect(calls).not.toContain("failed");
  });

  it("does not publish after an upload failure and marks the prefix for cleanup", async () => {
    const { calls, deps } = dependencies({ failOnKey: "clips/test-id/playlist.m3u8" });
    await expect(mediaImportModule?.importKickMediaPackage(metadata, "clips/test-id", deps))
      .rejects.toThrow("upload failure");

    expect(calls).toContain("cleanup");
    expect(calls).toContain("failed");
    expect(calls).not.toContain("publish");
  });

  it("records a cleanup failure while leaving the clip unpublished", async () => {
    const { calls, deps, recordedFailure } = dependencies({
      failOnKey: "clips/test-id/playlist.m3u8",
      failCleanup: true,
    });
    await expect(mediaImportModule?.importKickMediaPackage(metadata, "clips/test-id", deps))
      .rejects.toThrow(/limpeza dos arquivos temporários do R2/);

    expect(recordedFailure()).toContain("limpeza dos arquivos temporários do R2");
    expect(calls).toContain("failed");
    expect(calls).not.toContain("publish");
  });

  it("reports when the failed state could not be persisted", async () => {
    const { calls, deps } = dependencies({
      failOnKey: "clips/test-id/playlist.m3u8",
      failMarkFailed: true,
    });
    await expect(mediaImportModule?.importKickMediaPackage(metadata, "clips/test-id", deps))
      .rejects.toThrow(/banco não conseguiu registrar a falha/i);

    expect(calls).toContain("failed");
    expect(calls).not.toContain("publish");
  });
});
