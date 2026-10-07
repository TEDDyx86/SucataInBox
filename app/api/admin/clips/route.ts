import { NextResponse } from "next/server";
import { importKickClip } from "@/lib/clip-import";
import { getStaffContext, hasSupabaseServerConfig } from "@/lib/supabase/server";
import { importTwitchClip } from "@/lib/twitch-clip-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ error: "O Supabase ainda não está configurado." }, { status: 503 });
  }

  const staff = await getStaffContext();
  if (!staff) return NextResponse.json({ error: "Faça login com uma conta de staff." }, { status: 401 });

  let body: { sourcePlatform?: unknown; sourceUrl?: unknown };
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) return NextResponse.json({ error: "Requisição muito grande." }, { status: 413 });
    body = JSON.parse(rawBody) as { sourcePlatform?: unknown; sourceUrl?: unknown };
  } catch {
    return NextResponse.json({ error: "Envie um JSON válido com o link do clipe." }, { status: 400 });
  }
  if (body.sourcePlatform !== "kick" && body.sourcePlatform !== "twitch") {
    return NextResponse.json({ error: "Selecione Kick ou Twitch como plataforma do clipe." }, { status: 400 });
  }
  if (typeof body.sourceUrl !== "string" || body.sourceUrl.length > 2048) {
    return NextResponse.json({ error: "Informe o link do clipe." }, { status: 400 });
  }
  try {
    const clip = body.sourcePlatform === "kick"
      ? await importKickClip(body.sourceUrl, staff)
      : await importTwitchClip(body.sourceUrl, staff);
    return NextResponse.json({ clip }, { status: 201 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    const duplicate = rawMessage.includes("já está importado");
    const configuration = rawMessage.startsWith("Configure");
    const inputError = /^(Informe|O link|O identificador|O clipe precisa|O canal (Kick|Twitch)|Clipe não encontrado|A playlist|Só é possível|A Kick retornou|A Twitch retornou|Clipes HLS|Um dos arquivos|O clipe excede|A resposta da Kick não é)/i.test(rawMessage);
    const operationalMessage = rawMessage.startsWith("O banco não conseguiu");
    const safeMessage = duplicate || configuration || inputError || operationalMessage
      ? rawMessage
      : "Falha ao importar o clipe. Confira as conexões com a plataforma, Supabase e R2 e tente novamente.";
    const status = configuration ? 503 : duplicate ? 409 : inputError ? 422 : 502;
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
