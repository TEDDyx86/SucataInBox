import { afterEach, describe, expect, it, vi } from "vitest";
import { parseClipSubmission } from "../src/lib/clip-submission-input";

const kickUrl = "https://kick.com/aninha-gameplay-trynda/clips/clip_01M46K06Z01GDT3T87F3E4B7EG?share=1";
const twitchUrl = "https://clips.twitch.tv/FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU";

afterEach(() => vi.useRealTimers());

describe("parseClipSubmission", () => {
  it("accepts Kick links and requires consent for a public nickname", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T12:00:00.000Z"));

    expect(parseClipSubmission({
      sourceUrl: ` ${kickUrl} `,
      displayName: "  ClipFan  ",
      consent: true,
    })).toEqual({
      ok: true,
      value: {
        sourcePlatform: "kick",
        sourceClipId: "clip_01M46K06Z01GDT3T87F3E4B7EG",
        sourceUrl: kickUrl,
        displayName: "ClipFan",
        displayNameConsentAt: "2026-10-12T12:00:00.000Z",
      },
    });
  });

  it("accepts Twitch links without a nickname", () => {
    expect(parseClipSubmission({ sourceUrl: twitchUrl, displayName: "", consent: false })).toEqual({
      ok: true,
      value: {
        sourcePlatform: "twitch",
        sourceClipId: "FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU",
        sourceUrl: twitchUrl,
        displayName: null,
        displayNameConsentAt: null,
      },
    });
  });

  it("rejects a nickname without explicit publication consent", () => {
    expect(parseClipSubmission({ sourceUrl: kickUrl, displayName: "ClipFan", consent: false }))
      .toMatchObject({ ok: false });
  });

  it("normalizes an empty nickname to no attribution even if consent remained checked", () => {
    expect(parseClipSubmission({ sourceUrl: kickUrl, displayName: "  ", consent: true }))
      .toMatchObject({ ok: true, value: { displayName: null, displayNameConsentAt: null } });
  });

  it.each([
    "https://evil.example/clips/clip_01M46K06Z01GDT3T87F3E4B7EG",
    "http://kick.com/aninha-gameplay-trynda/clips/clip_01M46K06Z01GDT3T87F3E4B7EG",
    "not a url",
  ])("rejects unsafe or malformed URL %s", (sourceUrl) => {
    expect(parseClipSubmission({ sourceUrl, consent: false })).toMatchObject({ ok: false });
  });

  it("rejects oversized nicknames and non-object payloads", () => {
    expect(parseClipSubmission({ sourceUrl: kickUrl, displayName: "n".repeat(41), consent: true }))
      .toMatchObject({ ok: false });
    expect(parseClipSubmission(null)).toMatchObject({ ok: false });
  });

  it("rejects oversized URLs and fields with the wrong runtime type", () => {
    expect(parseClipSubmission({ sourceUrl: `${kickUrl}${"x".repeat(2048)}` })).toMatchObject({ ok: false });
    expect(parseClipSubmission({ sourceUrl: kickUrl, displayName: 42, consent: true })).toMatchObject({ ok: false });
    expect(parseClipSubmission({ sourceUrl: kickUrl, displayName: "Name", consent: "yes" })).toMatchObject({ ok: false });
  });
});
