import { NextResponse } from "next/server";
import { TEAM } from "@/data/team";
import { deleteR2Objects, listR2Keys } from "@/lib/r2";
import { createSupabaseAdminClient, getStaffContext, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "O Supabase ainda não está configurado." }, { status: 503 });
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Clipe inválido." }, { status: 400 });

  let body: { playerId?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (typeof body.playerId !== "string" || !TEAM.some((player) => player.id === body.playerId)) {
    return NextResponse.json({ error: "Selecione um jogador válido do elenco." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clips")
    .update({ player_id: body.playerId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível atualizar o jogador do clipe." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Clipe não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "O Supabase ainda não está configurado." }, { status: 503 });
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Clipe inválido." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: clip, error: lookupError } = await supabase
    .from("clips")
    .select("storage_prefix")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Não foi possível localizar o clipe." }, { status: 500 });
  if (!clip) return NextResponse.json({ error: "Clipe não encontrado." }, { status: 404 });

  const { error: hideError } = await supabase.from("clips").update({ status: "processing" }).eq("id", id);
  if (hideError) return NextResponse.json({ error: "Não foi possível ocultar o clipe antes da remoção." }, { status: 500 });

  try {
    if (clip.storage_prefix) {
      await deleteR2Objects(await listR2Keys(clip.storage_prefix));
    }
    const { error } = await supabase.from("clips").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Os arquivos foram removidos; atualize e tente remover o registro novamente." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "O clipe foi ocultado, mas não foi possível remover os arquivos do R2." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
