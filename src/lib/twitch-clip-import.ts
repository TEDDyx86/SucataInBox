import "server-only";
import { findTeamPlayerByLiveHandle } from "@/lib/clip-player-mapping";
import { createSupabaseAdminClient, type StaffContext } from "@/lib/supabase/server";
import { resolveTwitchClip } from "@/lib/twitch-clips";

/** Store official Twitch metadata and embed reference; Twitch retains the video. */
export async function importTwitchClip(sourceUrl: string, submittedBy: StaffContext) {
  const metadata = await resolveTwitchClip(sourceUrl);
  const broadcasterLogin = metadata.broadcasterLogin;
  if (!broadcasterLogin) throw new Error("Não foi possível identificar o login Twitch do canal.");
  const player = findTeamPlayerByLiveHandle("twitch", broadcasterLogin);
  if (!player) throw new Error(`O canal Twitch "${broadcasterLogin}" não está vinculado a um jogador do elenco.`);
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("clips")
    .select("id, status")
    .eq("source_platform", "twitch")
    .eq("source_clip_id", metadata.clipId)
    .maybeSingle();
  if (lookupError) throw new Error("Não foi possível verificar se o clipe da Twitch já foi importado.");
  if (existing && existing.status !== "failed") {
    throw new Error("Este clipe já está importado.");
  }

  const record = {
    source_platform: "twitch",
    source_clip_id: metadata.clipId,
    source_url: metadata.sourceUrl,
    source_thumbnail_url: metadata.thumbnailUrl,
    source_created_at: metadata.createdAt,
    player_id: player.id,
    kick_clip_id: null,
    kick_url: null,
    title: metadata.title,
    channel_name: metadata.channelName,
    duration_seconds: Math.ceil(metadata.durationSeconds),
    view_count: metadata.viewCount,
    kick_created_at: null,
    thumbnail_key: null,
    playlist_key: null,
    storage_prefix: null,
    status: "published",
    submitted_by: submittedBy.id,
    failure_reason: null,
    imported_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("clips").update(record).eq("id", existing.id);
    if (error) throw new Error("Não foi possível atualizar o clipe da Twitch.");
    return { id: existing.id, title: metadata.title, playerId: player.id, playerName: player.name };
  }

  const { data, error } = await supabase
    .from("clips")
    .insert(record)
    .select("id")
    .single();
  if (error?.code === "23505") throw new Error("Este clipe já está importado.");
  if (error || !data) throw new Error("Não foi possível registrar o clipe da Twitch.");
  return { id: data.id, title: metadata.title, playerId: player.id, playerName: player.name };
}
