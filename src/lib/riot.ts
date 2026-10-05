import { unstable_cache } from "next/cache";
import type { Player } from "@/data/team";

/**
 * Chave da Riot lida do ambiente (.env.local em dev / Environment Variables na Vercel).
 */
const RIOT_KEY = process.env.RIOT_API_KEY?.trim();

const REGIONAL_ROUTING = "americas";
const PLATFORM_ROUTING = "br1";

/**
 * Mecanismo: `unstable_cache` (next/cache) com `revalidate`.
 * Por quê: no Next 16 o substituto oficial, `"use cache"` + `cacheLife`, exige
 * `cacheComponents: true` no next.config.ts (não ligado aqui) e seu handler
 * padrão é em memória por instância, que não sobrevive entre requisições em
 * serverless. O `unstable_cache` usa o cache incremental, que persiste entre
 * requisições e entre as duas rotas que consomem esta lib.
 *
 * TTL de 5 min: ranque muda poucas vezes por dia e a chave de desenvolvimento
 * da Riot só aguenta 500 requisições a cada 5 minutos — hoje gastamos 16 por
 * visita de página.
 */
const RANKS_TTL_SECONDS = 300;

/**
 * Janela sem nova tentativa depois de um 429/500 da Riot. Sem ela o cache
 * permanece velho e cada requisição volta a bater na Riot, o que só piora o
 * rate limit; enquanto a janela está aberta servimos o último valor válido.
 */
const FAILURE_BACKOFF_MS = 60_000;

export type Rank = {
  tier: string;
  division: string;
  leaguePoints: number;
  /** V/D em número de partidas da League. */
  wins: number;
  losses: number;
};

export type RankedSnapshot = {
  queue: string;
  rank: Rank;
};

type LeagueEntry = {
  queueType?: string;
  tier?: string;
  rank?: string;
  division?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
};

type RankedFetcher = () => Promise<RankedSnapshot[]>;

/** Um `unstable_cache` por jogador, construído uma única vez por processo. */
const cachedByKey = new Map<string, RankedFetcher>();
/** Requisições em voo por jogador: N visitantes simultâneos viram 1 busca só. */
const inFlightByKey = new Map<string, Promise<RankedSnapshot[]>>();
/** Último valor válido por jogador — é o que alimenta o stale-on-error. */
const lastGoodByKey = new Map<string, RankedSnapshot[]>();
/** Até quando não voltamos a consultar a Riot depois de uma falha. */
const backoffUntilByKey = new Map<string, number>();

function cacheKeyFor(player: Player): string {
  return `${player.riotId.gameName}#${player.riotId.tagLine}`;
}

function winsLosses(leagues: LeagueEntry[], queues: string[]): RankedSnapshot | null {
  const entry = leagues.find((l) => l.queueType && queues.includes(l.queueType));
  if (!entry) return null;
  const wins = entry.wins ?? 0;
  const losses = entry.losses ?? 0;
  return {
    queue: entry.queueType ?? queues[0],
    rank: {
      tier: entry.tier ?? "UNRANKED",
      division: entry.rank ?? entry.division ?? "",
      leaguePoints: entry.leaguePoints ?? 0,
      wins,
      losses,
    },
  };
}

export function hasRiotKey(): boolean {
  return Boolean(RIOT_KEY);
}

/**
 * Resolve Riot ID -> PUUID (americas.api.riotgames.com) -> Ranques (br1.api.riotgames.com).
 *
 * Tratamento com degradação graciosa para não quebrar o site caso a chave expire.
 */
async function fetchRanksFromRiot(player: Player): Promise<RankedSnapshot[]> {
  if (!RIOT_KEY) throw new Error("RIOT_API_KEY não configurada");
  const { gameName, tagLine } = player.riotId;
  const headers = { "X-Riot-Token": RIOT_KEY };

  // 1. Account-V1 usa roteamento regional (americas)
  const accountRes = await fetch(
    `https://${REGIONAL_ROUTING}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/` +
      `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    // `no-store` aqui só desligaria o cache de fetch do Next; quem cacheia é o
    // `unstable_cache` em volta, porque ele sobrevive entre requisições.
    { headers, cache: "no-store", signal: AbortSignal.timeout(8000) },
  );
  if (!accountRes.ok) {
    throw new Error(`${player.name}: conta Riot HTTP ${accountRes.status}`);
  }

  const { puuid } = (await accountRes.json()) as { puuid: string };

  // 2. League-V4 usa roteamento por plataforma (br1)
  const leagueRes = await fetch(
    `https://${PLATFORM_ROUTING}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
    { headers, cache: "no-store", signal: AbortSignal.timeout(8000) },
  );
  if (!leagueRes.ok) {
    throw new Error(`${player.name}: league HTTP ${leagueRes.status}`);
  }

  const leagues = (await leagueRes.json()) as LeagueEntry[];
  const solo = winsLosses(leagues, ["RANKED_SOLO_5x5"]);
  const flex = winsLosses(leagues, ["RANKED_FLEX_SR", "RANKED_FLEX_5x5"]);
  return [solo, flex].filter((x): x is RankedSnapshot => x !== null);
}

function cachedFetcherFor(player: Player): RankedFetcher {
  const key = cacheKeyFor(player);
  const existing = cachedByKey.get(key);
  if (existing) return existing;

  const fetcher = unstable_cache(() => fetchRanksFromRiot(player), ["riot-ranks", key], {
    revalidate: RANKS_TTL_SECONDS,
    tags: ["riot-ranks"],
  });
  cachedByKey.set(key, fetcher);
  return fetcher;
}

/**
 * Colapsa chamadas concorrentes no mesmo jogador em uma única busca upstream.
 * `unstable_cache` sozinho não garante isso em cache frio: sem o mapa, 30
 * visitantes simultâneos disparariam 30 x 16 requisições na Riot.
 */
function startOnce(key: string, fetcher: RankedFetcher): Promise<RankedSnapshot[]> {
  const running = inFlightByKey.get(key);
  if (running) return running;

  const promise = fetcher().finally(() => {
    inFlightByKey.delete(key);
  });
  inFlightByKey.set(key, promise);
  return promise;
}

/**
 * Ranque de um jogador, servido do cache compartilhado entre `app/page.tsx` e
 * `app/api/ranks` (ambos chamam esta função, então ambos compartilham a entrada).
 */
export async function getRanked(player: Player): Promise<RankedSnapshot[]> {
  if (!RIOT_KEY) throw new Error("RIOT_API_KEY não configurada");

  const key = cacheKeyFor(player);
  const stale = lastGoodByKey.get(key);

  // Ainda na janela de backoff: devolve o último valor válido sem tocar na Riot.
  if (stale !== undefined && Date.now() < (backoffUntilByKey.get(key) ?? 0)) {
    return stale;
  }

  try {
    const fresh = await startOnce(key, cachedFetcherFor(player));
    lastGoodByKey.set(key, fresh);
    backoffUntilByKey.delete(key);
    return fresh;
  } catch (error) {
    // 429/500 da Riot não pode apagar a V/D do site inteiro: o chamador recebe o
    // último valor válido e só vê a falha quando nunca houve um bom.
    backoffUntilByKey.set(key, Date.now() + FAILURE_BACKOFF_MS);
    if (stale !== undefined) return stale;
    throw error;
  }
}