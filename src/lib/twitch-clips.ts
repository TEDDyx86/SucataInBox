import "server-only";
import { getTwitchHelixAuth, invalidateTwitchHelixToken } from "@/lib/twitch";
import { normalizeTwitchClip, normalizeTwitchUser, parseTwitchClipUrl, type TwitchClipMetadata } from "@/lib/twitch-clip-parser";

const TWITCH_CLIPS_API = "https://api.twitch.tv/helix/clips";
const TWITCH_USERS_API = "https://api.twitch.tv/helix/users";

/** Resolve a Twitch share URL through the official Helix Get Clips endpoint. */
export async function resolveTwitchClip(
  sourceUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<TwitchClipMetadata> {
  const clipId = parseTwitchClipUrl(sourceUrl);
  const endpoint = new URL(TWITCH_CLIPS_API);
  endpoint.searchParams.set("id", clipId);

  const response = await requestHelix(endpoint, fetcher);
  if (!response.ok) {
    if (response.status === 404) throw new Error("Clipe não encontrado na Twitch.");
    throw new Error(`Não foi possível consultar a Twitch (HTTP ${response.status}).`);
  }

  const metadata = normalizeTwitchClip(await response.json(), clipId);
  metadata.broadcasterLogin = await resolveTwitchBroadcasterLogin(metadata.broadcasterId, fetcher);
  return metadata;
}

async function resolveTwitchBroadcasterLogin(broadcasterId: string, fetcher: typeof fetch): Promise<string> {
  const endpoint = new URL(TWITCH_USERS_API);
  endpoint.searchParams.set("id", broadcasterId);
  const response = await requestHelix(endpoint, fetcher);
  if (!response.ok) throw new Error(`Não foi possível consultar o canal da Twitch (HTTP ${response.status}).`);
  return normalizeTwitchUser(await response.json(), broadcasterId);
}

async function requestHelix(endpoint: URL, fetcher: typeof fetch): Promise<Response> {
  let auth = await getTwitchHelixAuth();
  let response = await fetchWithTwitchAuth(endpoint, auth, fetcher);
  if (response.status === 401) {
    invalidateTwitchHelixToken();
    auth = await getTwitchHelixAuth();
    response = await fetchWithTwitchAuth(endpoint, auth, fetcher);
  }
  return response;
}

function fetchWithTwitchAuth(
  endpoint: URL,
  auth: { clientId: string; accessToken: string },
  fetcher: typeof fetch,
): Promise<Response> {
  return fetcher(endpoint, {
    headers: { "Client-Id": auth.clientId, Authorization: `Bearer ${auth.accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
}
