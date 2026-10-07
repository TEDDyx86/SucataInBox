import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabasePublicConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (hasSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
