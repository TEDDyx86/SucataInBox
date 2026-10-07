import { describe, expect, it } from "vitest";

const queueModule = await import("../src/lib/clip-queue").catch(() => null);

describe("Kick import queue", () => {
  it("exposes queue creation from pasted links", () => {
    expect(queueModule).not.toBeNull();
  });

  it("trims multiline input, ignores blank lines, and creates queued entries", () => {
    const result = queueModule?.enqueueClipLinks(
      "  https://kick.com/vinnycaffe/clips/clip_01M46K06Z01GDT3T87F3E4B7EG  \n\nhttps://kick.com/aninha-gameplay-trynda/clips/clip_01M477GZSF6Z0V4YTB6BDCCPAC",
      "kick",
      [],
      () => "queue-id",
    );

    expect(result?.items).toHaveLength(2);
    expect(result?.items[0]).toMatchObject({
      id: "queue-id",
      sourcePlatform: "kick",
      clipId: "clip_01M46K06Z01GDT3T87F3E4B7EG",
      playerId: "yasuocadeirante",
      playerName: "YASUOCADEIRANTE",
      sourceUrl: "https://kick.com/vinnycaffe/clips/clip_01M46K06Z01GDT3T87F3E4B7EG",
      status: "queued",
    });
    expect(result?.items[1]).toMatchObject({
      playerId: "aninha-gameplay",
      playerName: "ANINHA GAMEPLAY",
    });
    expect(result?.issues).toHaveLength(0);
  });

  it("deduplicates links already queued or repeated in the pasted batch", () => {
    const url = "https://kick.com/vinnycaffe/clips/clip_01M46K06Z01GDT3T87F3E4B7EG";
    const result = queueModule?.enqueueClipLinks(`${url}\n${url}`, "kick", [], () => "queue-id");

    expect(result?.items).toHaveLength(1);
    expect(result?.issues).toHaveLength(1);
  });

  it("skips a clip that is already present from an earlier add operation", () => {
    const result = queueModule?.enqueueClipLinks(
      "https://kick.com/vinnycaffe/clips/clip_01M46K06Z01GDT3T87F3E4B7EG",
      "kick",
      [{ id: "existing", sourcePlatform: "kick", clipId: "clip_01M46K06Z01GDT3T87F3E4B7EG", sourceUrl: "", playerId: "yasuocadeirante", playerName: "YASUOCADEIRANTE", status: "queued" }],
      () => "queue-id",
    );

    expect(result?.items).toHaveLength(0);
    expect(result?.issues).toHaveLength(1);
  });

  it("reports invalid lines without blocking valid links", () => {
    const result = queueModule?.enqueueClipLinks(
      "not a Kick URL\nhttps://kick.com/aninha-gameplay-trynda/clips/clip_01M477GZSF6Z0V4YTB6BDCCPAC",
      "kick",
      [],
      () => "queue-id",
    );

    expect(result?.items).toHaveLength(1);
    expect(result?.issues).toHaveLength(1);
  });

  it("accepts a Twitch clip link and keeps its source platform", () => {
    const result = queueModule?.enqueueClipLinks(
      "https://clips.twitch.tv/FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU",
      "twitch",
      [],
      () => "twitch-queue-id",
    );

    expect(result?.items[0]).toMatchObject({
      sourcePlatform: "twitch",
      clipId: "FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU",
      playerId: null,
      playerName: "Identificando jogador pela Twitch",
    });
  });

  it("updates the requested queue item without changing other entries", () => {
    const queue = [
      { id: "one", sourcePlatform: "kick" as const, clipId: "clip_one", sourceUrl: "one", playerId: "a", playerName: "A", status: "queued" as const },
      { id: "two", sourcePlatform: "kick" as const, clipId: "clip_two", sourceUrl: "two", playerId: "b", playerName: "B", status: "queued" as const },
    ];
    const result = queueModule?.updateClipQueueItem(queue, "one", { status: "processing" });

    expect(result?.[0].status).toBe("processing");
    expect(result?.[1].status).toBe("queued");
  });
});
