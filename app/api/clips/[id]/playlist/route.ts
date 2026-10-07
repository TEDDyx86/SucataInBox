import { NextResponse } from "next/server";
import { getR2Object } from "@/lib/r2";
import { createSupabasePublicClient, hasSupabasePublicConfig } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  if (!hasSupabasePublicConfig()) return new Response("Clip service is not configured", { status: 503 });

  const supabase = createSupabasePublicClient();
  const { data: clip, error } = await supabase
    .from("clips")
    .select("playlist_key, source_platform")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error || !clip || clip.source_platform !== "kick" || !clip.playlist_key) return new Response("Not found", { status: 404 });

  try {
    const playlist = new TextDecoder().decode(await getR2Object(clip.playlist_key));
    return new NextResponse(playlist, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Playlist unavailable", { status: 502 });
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
