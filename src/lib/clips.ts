import "server-only";
import { getClipOwnerDisplay } from "@/lib/clip-owner-display";
import { createSupabasePublicClient, hasSupabasePublicConfig } from "@/lib/supabase/server";

export type PublishedClip = {
  id: string;
  source_platform: "kick" | "twitch";
  source_clip_id: string;
  source_url: string;
  source_thumbnail_url: string | null;
  source_created_at: string | null;
  title: string;
  player_id: string | null;
  coach_staff_id: string | null;
  player_name: string;
  owner_tag: "Coach Staff" | null;
  duration_seconds: number;
  view_count: number;
  created_at: string;
  community_submitter_name: string | null;
};

export async function getPublishedClips(): Promise<PublishedClip[]> {
  if (!hasSupabasePublicConfig()) return [];
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("clips")
    .select("id, source_platform, source_clip_id, source_url, source_thumbnail_url, source_created_at, title, player_id, coach_staff_id, duration_seconds, view_count, created_at, community_submitter_name")
    .eq("status", "published")
    .order("source_created_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os clipes publicados.");
  return (data ?? []).map((clip) => ({
    ...clip,
    player_name: getClipOwnerDisplay(clip.player_id, clip.coach_staff_id).name,
    owner_tag: getClipOwnerDisplay(clip.player_id, clip.coach_staff_id).tag,
  })) as PublishedClip[];
}
