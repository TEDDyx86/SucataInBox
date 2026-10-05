import { unstable_cache } from "next/cache";
import { TEAM, liveHandle } from "@/data/team";

/**
 * Canais na Kick, derivados do elenco pelo social de plataforma `kick`.
 *
 * O `player.kick` que existia antes foi aposentado: o slug agora vem da mesma
 * URL que o botão do card abre, então link e consulta não podem divergir.
 */
const KICK_SLUGS = TEAM.map((p) => liveHandle(p, "kick")).filter(
  (slug): slug is string => Boolean(slug),
);

/** Canais da Kick keyedados como `kick:<slug>`, no formato do agregador. */
type KickLive = Record<string, boolean>;

type KickChannel = {
  slug?: string;
  livestream?: { is_live?: boolean } | null;
  is_live?: boolean | null;
};

/**
 * TTL curto: live é mais volátil que ranque, mas 90s já corta ~99% do tráfego
 * repetido (a página e o poll do browser batem no mesmo cache).
 */
const LIVE_TTL_SECONDS = 90;

/** Chave do mapa de status para um slug da Kick. */
function key(slug: string): string {
  return `kick:${slug}`;
}

async function fetchKickChannel(slug: string): Promise<boolean> {
  const res = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
    // O cache de fetch do Next é desligado de propósito: quem cacheia é o
    // `unstable_cache` em volta, que sobrevive entre requisições.
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Kick ${slug}: HTTP ${res.status}`);
  const data = (await res.json()) as KickChannel;
  // A resposta traz o live dentro de `livestream`; o campo solto é fallback.
  return Boolean(data.livestream?.is_live ?? data.is_live);
}

/** Último valor booleano válido por canal, para não piscar "offline" numa falha. */
const lastGoodBySlug = new Map<string, boolean>();

async function fetchAllLive(): Promise<KickLive> {
  // Um canal que falhou não pode derrubar os outros: `allSettled` preserva o
  // `Promise.allSettled` original e o degraded fallback continua em pé.
  const results = await Promise.allSettled(KICK_SLUGS.map(fetchKickChannel));
  const status: KickLive = {};
  KICK_SLUGS.forEach((slug, i) => {
    const r = results[i];
    if (r.status === "fulfilled") {
      status[key(slug)] = r.value;
      return;
    }
    status[key(slug)] = lastGoodBySlug.get(slug) ?? false;
  });
  return status;
}

const cachedLiveStatus = unstable_cache(fetchAllLive, ["kick-live-status"], {
  revalidate: LIVE_TTL_SECONDS,
  tags: ["kick-live-status"],
});

/** Uma busca em voo por vez: 30 visitas simultâneas viram 1 consulta. */
let inFlight: Promise<KickLive> | null = null;
let lastKnownGood: KickLive | null = null;

function allOffline(): KickLive {
  return Object.fromEntries(KICK_SLUGS.map((slug) => [key(slug), false]));
}

function rememberGood(status: KickLive): void {
  lastKnownGood = status;
  for (const [slug, isLive] of Object.entries(status)) {
    lastGoodBySlug.set(slug.slice("kick:".length), isLive);
  }
}

/**
 * Status de live de todos os canais da Kick, keyedado como `kick:<slug>`.
 *
 * Nunca lança: se a Kick inteira falhar, devolve o último status conhecido (ou
 * todos offline), para que a falha de rede não derrube a página.
 */
export async function getKickLive(): Promise<KickLive> {
  inFlight ??= cachedLiveStatus().finally(() => {
    inFlight = null;
  });

  try {
    const status = await inFlight;
    rememberGood(status);
    return status;
  } catch {
    return lastKnownGood ?? allOffline();
  }
}