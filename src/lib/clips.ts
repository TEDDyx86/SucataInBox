import "server-only";
import { TEAM } from "@/data/team";
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
  player_name: string;
  duration_seconds: number;
  view_count: number;
  created_at: string;
};

export async function getPublishedClips(): Promise<PublishedClip[]> {
  if (!hasSupabasePublicConfig()) return [];
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("clips")
    .select("id, source_platform, source_clip_id, source_url, source_thumbnail_url, source_created_at, title, player_id, duration_seconds, view_count, created_at")
    .eq("status", "published")
    .order("source_created_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os clipes publicados.");
  const playerNames = new Map(TEAM.map((player) => [player.id, player.name]));
  return (data ?? []).map((clip) => ({
    ...clip,
    player_name: playerNames.get(clip.player_id) ?? "Jogador não atribuído",
  })) as PublishedClip[];
}
