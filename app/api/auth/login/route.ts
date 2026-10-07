import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabasePublicConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSupabasePublicConfig()) {
    return NextResponse.json({ error: "O login ainda não está configurado." }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) return NextResponse.json({ error: "Requisição muito grande." }, { status: 413 });
    body = JSON.parse(rawBody) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (typeof body.email !== "string" || typeof body.password !== "string" || !body.email.trim()) {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword({
    email: body.email.trim().toLowerCase(),
    password: body.password,
  });
  if (error) return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", signedIn.user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Esta conta ainda não tem acesso de staff." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
