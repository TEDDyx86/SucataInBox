import { describe, expect, it } from "vitest";

const strategyModule = await import("../src/lib/hls-playback-strategy").catch(() => null);

describe("HLS playback strategy", () => {
  it("exposes browser playback strategy selection", () => {
    expect(strategyModule).not.toBeNull();
  });

  it("prefers Hls.js when MSE is supported even if canPlayType says maybe", () => {
    expect(strategyModule?.chooseHlsPlaybackStrategy("maybe", true)).toBe("hls.js");
  });

  it("uses native HLS when MSE is unavailable but native HLS is advertised", () => {
    expect(strategyModule?.chooseHlsPlaybackStrategy("maybe", false)).toBe("native");
  });

  it("reports unsupported when neither playback path is available", () => {
    expect(strategyModule?.chooseHlsPlaybackStrategy("", false)).toBe("unsupported");
  });
});
