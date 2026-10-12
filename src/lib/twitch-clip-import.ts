import "server-only";
import { findClipOwnerByLiveHandle, toClipOwnerColumns } from "@/lib/clip-owner-mapping";
import { createSupabaseAdminClient, type StaffContext } from "@/lib/supabase/server";
import { resolveTwitchClip } from "@/lib/twitch-clips";
import { resolveClipImportOwnership } from "@/lib/community-clip-import";
import type { CommunityClipImportContext } from "@/lib/clip-import";

/** Store official Twitch metadata and embed reference; Twitch retains the video. */
export async function importTwitchClip(sourceUrl: string, submittedBy: StaffContext, community?: CommunityClipImportContext) {
  const metadata = await resolveTwitchClip(sourceUrl);
  const broadcasterLogin = metadata.broadcasterLogin;
  if (!broadcasterLogin) throw new Error("Não foi possível identificar o login Twitch do canal.");
  const owner = findClipOwnerByLiveHandle("twitch", broadcasterLogin);
  if (!owner) throw new Error(`O canal Twitch "${broadcasterLogin}" não está vinculado a um jogador nem ao Coach Staff.`);
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("clips")
    .select("id, status, community_submission_id")
    .eq("source_platform", "twitch")
    .eq("source_clip_id", metadata.clipId)
    .maybeSingle();
  if (lookupError) throw new Error("Não foi possível verificar se o clipe da Twitch já foi importado.");
  const ownership = resolveClipImportOwnership(existing, community?.submissionId ?? null);

  const record = {
    source_platform: "twitch",
    source_clip_id: metadata.clipId,
    source_url: metadata.sourceUrl,
    source_thumbnail_url: metadata.thumbnailUrl,
    source_created_at: metadata.createdAt,
    ...toClipOwnerColumns(owner),
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
    status: community ? "processing" : "published",
    submitted_by: submittedBy.id,
    community_submitter_name: null,
    community_name_consent_at: null,
    community_submission_id: community?.submissionId ?? null,
    community_import_started_at: community?.processingStartedAt ?? null,
    failure_reason: null,
    imported_at: community ? null : new Date().toISOString(),
  };

  let clipId: string;
  if (ownership === "retry") {
    if (!existing) throw new Error("Não foi possível localizar o clipe para retry.");
    clipId = existing.id;
    const { error } = await supabase.from("clips").update(record).eq("id", existing.id);
    if (error) throw new Error("Não foi possível atualizar o clipe da Twitch.");
  } else {
    const { data, error } = await supabase.from("clips").insert(record).select("id").single();
    if (error?.code === "23505") throw new Error("Este clipe já está importado.");
    if (error || !data) throw new Error("Não foi possível registrar o clipe da Twitch.");
    clipId = data.id;
  }

  if (community) {
    const { data, error } = await supabase.rpc("finalize_community_clip_import", {
      p_submission_id: community.submissionId,
      p_clip_id: clipId,
      p_processing_started_at: community.processingStartedAt,
    });
    if (error || data !== true) {
      await supabase.from("clips").update({ status: "failed", failure_reason: "Não foi possível finalizar a submissão." })
        .eq("id", clipId).eq("community_submission_id", community.submissionId)
        .eq("community_import_started_at", community.processingStartedAt).eq("status", "processing");
      throw new Error("Não foi possível finalizar a submissão comunitária da Twitch.");
    }
  }

  return {
    id: clipId,
    title: metadata.title,
    playerId: owner.type === "player" ? owner.id : null,
    coachStaffId: owner.type === "coach_staff" ? owner.id : null,
    ownerType: owner.type,
    playerName: owner.name,
  };
}
