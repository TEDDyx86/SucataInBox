const TWITCH_PAGE_HOSTS = new Set(["clips.twitch.tv", "twitch.tv", "www.twitch.tv", "m.twitch.tv"]);
const TWITCH_CLIP_MEDIA_HOSTS = /^(?:clips-media-assets\d*\.twitch\.tv|static-cdn\.jtvnw\.net)$/i;
const CLIP_ID_PATTERN = /^[a-z0-9_-]{5,100}$/i;

export type TwitchClipMetadata = {
  clipId: string;
  broadcasterId: string;
  broadcasterLogin?: string;
  sourceUrl: string;
  thumbnailUrl: string;
  title: string;
  channelName: string;
  durationSeconds: number;
  viewCount: number;
  createdAt: string | null;
};

type TwitchClipRecord = {
  id?: string;
  broadcaster_id?: string;
  url?: string;
  broadcaster_name?: string;
  title?: string;
  thumbnail_url?: string;
  duration?: number;
  view_count?: number;
  created_at?: string;
};

/** Accept official Twitch clip share URLs and extract the Helix clip slug. */
export function parseTwitchClipUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Informe um link válido de clipe da Twitch.");
  }

  if (url.protocol !== "https:" || !TWITCH_PAGE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("O link precisa ser uma página HTTPS da Twitch.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const isClipHost = url.hostname.toLowerCase() === "clips.twitch.tv";
  const isEmbedUrl = isClipHost && segments[0]?.toLowerCase() === "embed";
  const clipIndex = isClipHost ? -1 : segments.findIndex((segment) => segment.toLowerCase() === "clip");
  const clipId = isEmbedUrl
    ? url.searchParams.get("clip") ?? undefined
    : isClipHost
      ? segments[0]
      : clipIndex >= 0 ? segments[clipIndex + 1] : undefined;

  if (!clipId || (isClipHost && segments.length !== 1) || (isEmbedUrl && !url.searchParams.has("clip")) || !CLIP_ID_PATTERN.test(clipId)) {
    throw new Error("O link não parece ser um clipe da Twitch.");
  }
  return clipId;
}

/** Normalize and validate the data returned by Helix Get Clips. */
export function normalizeTwitchClip(payload: unknown, expectedClipId: string): TwitchClipMetadata {
  const data = (payload as { data?: TwitchClipRecord[] } | null)?.data;
  const clip = data?.find((item) => item.id === expectedClipId);
  if (!clip) throw new Error("Clipe não encontrado na Twitch.");

  const sourceUrl = clip.url;
  const thumbnailUrl = clip.thumbnail_url;
  const broadcasterId = clip.broadcaster_id?.trim();
  const title = clip.title?.trim();
  const channelName = clip.broadcaster_name?.trim();
  const durationSeconds = Number(clip.duration);
  if (!broadcasterId || !title || !channelName || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 180) {
    throw new Error("Os metadados do clipe da Twitch estão incompletos.");
  }
  if (!isTwitchSourceUrl(sourceUrl, expectedClipId) || !isTwitchThumbnailUrl(thumbnailUrl)) {
    throw new Error("A Twitch retornou URLs inválidas para este clipe.");
  }

  return {
    clipId: expectedClipId,
    broadcasterId,
    sourceUrl,
    thumbnailUrl,
    title,
    channelName,
    durationSeconds,
    viewCount: Math.max(0, Number(clip.view_count) || 0),
    createdAt: clip.created_at && Number.isFinite(Date.parse(clip.created_at)) ? clip.created_at : null,
  };
}

export function normalizeTwitchUser(payload: unknown, expectedId: string): string {
  const data = (payload as { data?: { id?: string; login?: string }[] } | null)?.data;
  const user = data?.find((item) => item.id === expectedId);
  const login = user?.login?.trim().toLowerCase();
  if (!login || !/^[a-z0-9_]{1,25}$/.test(login)) {
    throw new Error("Não foi possível identificar o canal Twitch responsável pelo clipe.");
  }
  return login;
}

function isTwitchSourceUrl(value: string | undefined, clipId: string): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && (url.hostname === "clips.twitch.tv" || url.hostname === "www.twitch.tv")
      && url.pathname.toLowerCase().includes(clipId.toLowerCase());
  } catch {
    return false;
  }
}

function isTwitchThumbnailUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && TWITCH_CLIP_MEDIA_HOSTS.test(url.hostname);
  } catch {
    return false;
  }
}
