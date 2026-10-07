export type HlsPlaybackStrategy = "hls.js" | "native" | "unsupported";

export function chooseHlsPlaybackStrategy(
  nativeHlsSupport: string,
  hlsJsSupported: boolean,
): HlsPlaybackStrategy {
  if (hlsJsSupported) return "hls.js";
  if (nativeHlsSupport) return "native";
  return "unsupported";
}
