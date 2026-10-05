import { NextResponse } from "next/server";
import { TEAM } from "@/data/team";
import { getRanked, hasRiotKey, type RankedSnapshot } from "@/lib/riot";

export const dynamic = "force-dynamic";

/**
 * O payload já vem cacheado por `unstable_cache` em `@/lib/riot`, então o CDN
 * pode absorver as sondagens de 60s dos navegadores sem multiplicar as
 * chamadas à Riot: `s-maxage` vale para cache compartilhado, `max-age=0` impede que o
 * navegador guarde ranque por minutos, e o `stale-while-revalidate` segura o
 * pico quando o cache expira.
 */
const RANKS_CACHE_CONTROL = "public, max-age=0, s-maxage=300, stale-while-revalidate=300";

/**
 * GET /api/ranks
 *
 * Devolve o ranque de cada jogador. Se a chave da Riot não estiver
 * configurada ou for rejeitada, responde 200 com `enabled: false` e um
 * motivo — assim a página continua funcionando e apenas esconde a V/D.
 * Quando existe um valor anterior válido, `getRanked` o devolve em vez de
 * falhar, e a V/D continua aparecendo mesmo com a Riot devolvendo 429/500.
 */
export async function GET() {
  if (!hasRiotKey()) {
    return NextResponse.json(
      { enabled: false, reason: "Chave da Riot não configurada.", ranks: {} },
      { headers: { "Cache-Control": RANKS_CACHE_CONTROL } },
    );
  }

  const settled = await Promise.allSettled(TEAM.map((p) => getRanked(p)));
  const ranks: Record<string, RankedSnapshot[]> = {};
  let failures = 0;

  settled.forEach((r, i) => {
    if (r.status === "fulfilled") ranks[TEAM[i].id] = r.value;
    else failures++;
  });

  return NextResponse.json(
    { enabled: failures < TEAM.length, ranks },
    { headers: { "Cache-Control": RANKS_CACHE_CONTROL } },
  );
}