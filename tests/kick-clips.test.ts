import { describe, expect, it } from "vitest";

const kickClipModule = await import("../src/lib/kick-clips").catch(() => null);
const hlsModule = await import("../src/lib/hls-playlist").catch(() => null);
const kickSourceModule = await import("../src/lib/kick-source").catch(() => null);

describe("Kick clip URL parsing", () => {
  it("exposes the URL parser required by the import flow", () => {
    expect(kickClipModule).not.toBeNull();
  });

  it("extracts a clip ID and channel slug from a public clip URL", () => {
    expect(kickClipModule?.parseKickClipUrl(
      "https://kick.com/aninha-gameplay-trynda/clips/clip_01M46K06Z01GDT3T87F3E4B7EG?share=1",
    )).toEqual({
      clipId: "clip_01M46K06Z01GDT3T87F3E4B7EG",
      channelSlug: "aninha-gameplay-trynda",
    });
  });

  it("rejects non-Kick URLs", () => {
    expect(() => kickClipModule?.parseKickClipUrl(
      "https://evil.example/aninha/clips/clip_01M46K06Z01GDT3T87F3E4B7EG",
    )).toThrow();
  });
});

describe("Kick HLS playlist preparation", () => {
  it("exposes a playlist rewriter for private R2 media", () => {
    expect(hlsModule).not.toBeNull();
  });

  it("preserves byte ranges and maps repeated source segments to one stored object", () => {
    const input = [
      "#EXTM3U",
      "#EXT-X-BYTERANGE:100@0",
      "#EXTINF:2.0,",
      "178.ts",
      "#EXT-X-BYTERANGE:80@100",
      "#EXTINF:2.0,",
      "178.ts",
      "#EXT-X-ENDLIST",
    ].join("\n");

    const result = hlsModule?.rewriteKickMediaPlaylist(
      input,
      "https://clips.kick.com/clips/11/clip_01M46K06Z01GDT3T87F3E4B7EG/playlist.m3u8",
      "media",
    );

    expect(result?.resources).toHaveLength(1);
    expect(result?.playlist).toContain("#EXT-X-BYTERANGE:100@0");
    expect(result?.playlist).toContain("#EXT-X-BYTERANGE:80@100");
    expect(result?.playlist.match(/media\/[a-f0-9]+\.ts/g)).toHaveLength(2);
    expect(result?.playlist.split("\n").filter((line: string) => line.startsWith("media/"))[0])
      .toBe(result?.playlist.split("\n").filter((line: string) => line.startsWith("media/"))[1]);
  });

  it("rejects encrypted media playlists", () => {
    expect(() => hlsModule?.rewriteKickMediaPlaylist(
      "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key.bin\"\n#EXTINF:2,\n178.ts\n#EXT-X-ENDLIST",
      "https://clips.kick.com/clips/11/clip_id/playlist.m3u8",
      "media",
    )).toThrow(/criptograf/i);
  });
});

describe("Kick clip metadata resolution", () => {
  it("exposes a resolver for the public Kick clip endpoint", () => {
    expect(kickSourceModule).not.toBeNull();
  });

  it("normalizes the public clip metadata returned by Kick", async () => {
    const fetcher: typeof fetch = async () => Response.json({
      clip: {
        id: "clip_01M46K06Z01GDT3T87F3E4B7EG",
        title: "Errando tudo",
        duration: 26,
        privacy: "public",
        video_url: "https://clips.kick.com/clips/11/clip_01M46K06Z01GDT3T87F3E4B7EG/playlist.m3u8",
        thumbnail_url: "https://clips.kick.com/clips/11/clip_01M46K06Z01GDT3T87F3E4B7EG/thumbnail.webp",
        view_count: 35,
        created_at: "2026-10-05T17:50:51.070507Z",
        channel: { username: "Aninha_gameplay_trynda", slug: "aninha-gameplay-trynda" },
      },
    });

    await expect(kickSourceModule?.resolveKickClip(
      "clip_01M46K06Z01GDT3T87F3E4B7EG",
      fetcher,
    )).resolves.toMatchObject({
      clipId: "clip_01M46K06Z01GDT3T87F3E4B7EG",
      title: "Errando tudo",
      channelName: "Aninha_gameplay_trynda",
      durationSeconds: 26,
      playlistUrl: "https://clips.kick.com/clips/11/clip_01M46K06Z01GDT3T87F3E4B7EG/playlist.m3u8",
    });
  });

  it("rejects non-public clips", async () => {
    const fetcher: typeof fetch = async () => Response.json({
      clip: {
        id: "clip_01M46K06Z01GDT3T87F3E4B7EG",
        privacy: "private",
        title: "private",
        duration: 10,
        video_url: "https://clips.kick.com/clips/11/clip_01M46K06Z01GDT3T87F3E4B7EG/playlist.m3u8",
        thumbnail_url: "https://clips.kick.com/thumb.webp",
        channel: { username: "player" },
      },
    });

    await expect(kickSourceModule?.resolveKickClip(
      "clip_01M46K06Z01GDT3T87F3E4B7EG",
      fetcher,
    )).rejects.toThrow(/público/i);
  });
});
