import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getStaffContext, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "O Supabase ainda não está configurado." }, { status: 503 });
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Apenas administradores podem gerenciar usuários." }, { status: 403 });

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  if (id === staff.id) return NextResponse.json({ error: "Não é possível remover sua própria conta." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: "Não foi possível remover o usuário." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
