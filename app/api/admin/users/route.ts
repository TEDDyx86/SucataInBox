import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getStaffContext, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function adminGate() {
  if (!hasSupabaseServerConfig()) {
    return { response: NextResponse.json({ error: "O Supabase ainda não está configurado." }, { status: 503 }) };
  }
  const staff = await getStaffContext();
  if (!staff) return { response: NextResponse.json({ error: "Faça login para continuar." }, { status: 401 }) };
  if (staff.role !== "admin") return { response: NextResponse.json({ error: "Apenas administradores podem gerenciar usuários." }, { status: 403 }) };
  return { staff };
}

export async function POST(request: Request) {
  const gate = await adminGate();
  if (gate.response) return gate.response;

  let body: { email?: unknown; password?: unknown; displayName?: unknown; role?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const role = body.role === "admin" || body.role === "moderator" ? body.role : null;
  if (!email || email.length > 254 || !email.includes("@") || !displayName || displayName.length > 80 || !role) {
    return NextResponse.json({ error: "Revise email, nome e função do usuário." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: "A senha inicial deve ter entre 12 e 128 caracteres." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message.includes("already") ? "Já existe uma conta com este email." : "Não foi possível criar a conta." }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    email,
    display_name: displayName,
    role,
  });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "A conta foi criada, mas não foi possível gravar o perfil." }, { status: 500 });
  }

  return NextResponse.json({ user: { id: data.user.id, email, displayName, role } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const gate = await adminGate();
  if (gate.response) return gate.response;
  let body: { id?: unknown; role?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !isUuid(body.id) || (body.role !== "admin" && body.role !== "moderator")) {
    return NextResponse.json({ error: "Usuário ou função inválida." }, { status: 400 });
  }
  if (body.id === gate.staff.id && body.role !== "admin") {
    return NextResponse.json({ error: "Não é possível remover sua própria função de admin nesta tela." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("profiles").update({ role: body.role }).eq("id", body.id);
  if (error) return NextResponse.json({ error: "Não foi possível atualizar a função." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
