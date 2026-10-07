import { getR2SignedUrl } from "@/lib/r2";
import { createSupabasePublicClient, hasSupabasePublicConfig } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string; filename: string }> }) {
  const { id, filename } = await context.params;
  if (!isUuid(id) || !/^[a-f0-9]{64}\.(?:ts|m4s|mp4|aac|m4a|vtt)$/i.test(filename)) {
    return new Response("Not found", { status: 404 });
  }
  if (!hasSupabasePublicConfig()) return new Response("Clip service is not configured", { status: 503 });

  const supabase = createSupabasePublicClient();
  const { data: clip, error } = await supabase
    .from("clips")
    .select("storage_prefix, source_platform")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error || !clip || clip.source_platform !== "kick" || !clip.storage_prefix) return new Response("Not found", { status: 404 });

  try {
    const signedUrl = await getR2SignedUrl(`${clip.storage_prefix}/media/${filename}`, 90);
    return new Response(null, {
      status: 307,
      headers: {
        Location: signedUrl,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Media unavailable", { status: 502 });
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
