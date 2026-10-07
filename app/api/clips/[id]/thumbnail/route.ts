import { getR2SignedUrl } from "@/lib/r2";
import { createSupabasePublicClient, hasSupabasePublicConfig } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  if (!hasSupabasePublicConfig()) return new Response("Clip service is not configured", { status: 503 });

  const supabase = createSupabasePublicClient();
  const { data: clip, error } = await supabase
    .from("clips")
    .select("thumbnail_key, source_platform")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error || !clip || clip.source_platform !== "kick" || !clip.thumbnail_key) return new Response("Not found", { status: 404 });

  try {
    const signedUrl = await getR2SignedUrl(clip.thumbnail_key, 300);
    return new Response(null, {
      status: 307,
      headers: { Location: signedUrl, "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return new Response("Thumbnail unavailable", { status: 502 });
  }
}
