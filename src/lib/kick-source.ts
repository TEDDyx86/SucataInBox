const KICK_API = "https://kick.com/api/v2/clips";
const KICK_MEDIA_HOST = "clips.kick.com";
const CLIP_ID_PATTERN = /^clip_[a-z0-9]{20,32}$/i;
const MAX_CLIP_DURATION_SECONDS = 180;

type KickClipResponse = {
  clip?: {
    id?: string;
    title?: string;
    duration?: number;
    privacy?: string;
    video_url?: string;
    clip_url?: string;
    thumbnail_url?: string;
    view_count?: number;
    created_at?: string;
    channel?: { username?: string } | null;
  } | null;
};

export type KickClipMetadata = {
  clipId: string;
  title: string;
  channelName: string;
  durationSeconds: number;
  playlistUrl: string;
  thumbnailUrl: string;
  viewCount: number;
  createdAt: string | null;
};

/** Fetch metadata via Kick's public clip endpoint and validate every remote URL. */
export async function resolveKickClip(
  clipId: string,
  fetcher: typeof fetch = fetch,
): Promise<KickClipMetadata> {
  if (!CLIP_ID_PATTERN.test(clipId)) {
    throw new Error("O identificador do clipe da Kick é inválido.");
  }

  const response = await fetcher(`${KICK_API}/${encodeURIComponent(clipId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Clipe não encontrado na Kick.");
    throw new Error(`Não foi possível consultar a Kick (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as KickClipResponse;
  const clip = payload.clip;
  if (!clip || clip.id !== clipId || clip.privacy !== "public") {
    throw new Error("O clipe precisa existir e estar público na Kick.");
  }

  const durationSeconds = Number(clip.duration);
  const title = clip.title?.trim();
  const channelName = clip.channel?.username?.trim();
  const playlistUrl = clip.video_url ?? clip.clip_url;
  const thumbnailUrl = clip.thumbnail_url;
  if (!title || !channelName || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_CLIP_DURATION_SECONDS) {
    throw new Error("Os metadados do clipe estão incompletos ou excedem o limite de duração.");
  }
  if (!playlistUrl || !thumbnailUrl || !isKickMediaUrl(playlistUrl, clipId) || !isKickMediaUrl(thumbnailUrl)) {
    throw new Error("A Kick retornou URLs de mídia inválidas para este clipe.");
  }

  return {
    clipId,
    title,
    channelName,
    durationSeconds,
    playlistUrl,
    thumbnailUrl,
    viewCount: Math.max(0, Number(clip.view_count) || 0),
    createdAt: clip.created_at && Number.isFinite(Date.parse(clip.created_at)) ? clip.created_at : null,
  };
}

function isKickMediaUrl(value: string, clipId?: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname.toLowerCase() === KICK_MEDIA_HOST
      && (!clipId || url.pathname.includes(`/${clipId}/`));
  } catch {
    return false;
  }
}
