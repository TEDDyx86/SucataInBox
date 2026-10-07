import { describe, expect, it } from "vitest";

const twitchClips = await import("../src/lib/twitch-clip-parser").catch(() => null);

describe("Twitch clip source", () => {
  it("exposes a Twitch clip URL parser", () => {
    expect(twitchClips).not.toBeNull();
  });

  it("parses both clips.twitch.tv and channel clip URLs", () => {
    expect(twitchClips?.parseTwitchClipUrl("https://clips.twitch.tv/FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU"))
      .toBe("FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU");
    expect(twitchClips?.parseTwitchClipUrl("https://www.twitch.tv/mychamaqueeuvou/clip/FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU?filter=clips"))
      .toBe("FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU");
    expect(twitchClips?.parseTwitchClipUrl("https://clips.twitch.tv/embed?clip=FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU&parent=localhost"))
      .toBe("FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU");
  });

  it("rejects non-Twitch hosts and non-clip pages", () => {
    expect(() => twitchClips?.parseTwitchClipUrl("https://evil.example/clip/FunPoisedGiraffeGingerPower"))
      .toThrow();
    expect(() => twitchClips?.parseTwitchClipUrl("https://www.twitch.tv/mychamaqueeuvou"))
      .toThrow();
  });

  it("normalizes Helix metadata while keeping the Twitch URL as the source", () => {
    expect(twitchClips?.normalizeTwitchClip({
      data: [{
        id: "FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU",
        url: "https://clips.twitch.tv/FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU",
        embed_url: "https://clips.twitch.tv/embed?clip=FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU",
        broadcaster_id: "123456",
        broadcaster_name: "mychamaqueeuvou",
        creator_name: "viewer",
        title: "A jogada",
        thumbnail_url: "https://clips-media-assets2.twitch.tv/example-preview-480x272.jpg",
        view_count: 42,
        duration: 19.5,
        created_at: "2026-10-07T11:00:00Z",
      }],
    }, "FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU")).toMatchObject({
      clipId: "FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU",
      broadcasterId: "123456",
      title: "A jogada",
      channelName: "mychamaqueeuvou",
      durationSeconds: 19.5,
      viewCount: 42,
      sourceUrl: "https://clips.twitch.tv/FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU",
      thumbnailUrl: "https://clips-media-assets2.twitch.tv/example-preview-480x272.jpg",
    });
  });

  it("normalizes a broadcaster login separately from the display name", () => {
    expect(twitchClips?.normalizeTwitchUser({
      data: [{ id: "123456", login: "my_chamaqueeuvou", display_name: "MyChamaqueeuvou" }],
    }, "123456")).toBe("my_chamaqueeuvou");
  });
});
