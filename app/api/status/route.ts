import { NextResponse } from "next/server";
import { getLiveStatus } from "@/lib/kick";

export const dynamic = "force-dynamic";

/**
 * Mesmo esquema do `/api/ranks`, com TTL curto porque live muda rápido: o cache
 * compartilhado absorve o poll de 60s do browser, enquanto `max-age=0` mantém
 * a consulta da aba presa ao TTL do cache.
 */
const STATUS_CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=60";

/** GET /api/status -> { "glub-lub": true, ... } */
export async function GET() {
  try {
    const status = await getLiveStatus();
    return NextResponse.json(status, {
      headers: { "Cache-Control": STATUS_CACHE_CONTROL },
    });
  } catch {
    return NextResponse.json({ error: "falha ao consultar a Kick" }, { status: 502 });
  }
}