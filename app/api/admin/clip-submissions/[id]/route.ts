import { NextResponse } from "next/server";
import { moderateClipSubmission } from "@/lib/clip-submission-moderation-server";
import { getStaffContext, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "Supabase indisponível." }, { status: 503 });
  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "Faça login com uma conta de staff." }, { status: 401 });

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Submissão inválida." }, { status: 400 });

  let body: { action?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 512) return NextResponse.json({ error: "Requisição muito grande." }, { status: 413 });
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (body.action !== "approve" && body.action !== "retry" && body.action !== "reject") {
    return NextResponse.json({ error: "Ação de moderação inválida." }, { status: 400 });
  }

  const result = await moderateClipSubmission(id, body.action, staff);
  switch (result.kind) {
    case "published":
    case "deleted":
      return NextResponse.json({ ok: true, result: result.kind });
    case "not-found":
      return NextResponse.json({ error: "Submissão não encontrada." }, { status: 404 });
    case "conflict":
      return NextResponse.json({ error: "Esta submissão está sendo processada por outra ação. Atualize a fila." }, { status: 409 });
    case "failed":
      return NextResponse.json({ error: "O processamento falhou. A submissão permanece disponível para retry." }, { status: 502 });
    case "cleanup-failed":
      return NextResponse.json({ error: "A exclusão não foi concluída. A mídia continua oculta; tente novamente." }, { status: 502 });
    default:
      return NextResponse.json({ error: "Faça login com uma conta de staff." }, { status: 401 });
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
