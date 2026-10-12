import { NextResponse } from "next/server";
import { handleClipSubmissionPost } from "@/lib/clip-submission-http";
import { createClipSubmission } from "@/lib/clip-submissions";
import { createSupabaseAdminClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json(
      { error: "Não foi possível receber o envio agora. Tente novamente mais tarde." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const supabase = createSupabaseAdminClient();
  return handleClipSubmissionPost(request, {
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY,
    submit: (value, ipHash) => createClipSubmission(value, ipHash, async (name, args) => {
      const { data, error } = await supabase.rpc(name, args);
      return { data, error };
    }),
  });
}
