import { unstable_cache } from "next/cache";
import { TEAM } from "@/data/team";

/** Canais na Kick, derivados do elenco (só quem tem `kick` preenchido). */
const KICK_SLUGS = TEAM.filter((p) => p.kick).map((p) => p.kick!);

export type LiveStatus = Record<string, boolean>;

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

async function fetchAllLive(): Promise<LiveStatus> {
  // Um canal que falhou não pode derrubar os outros: `allSettled` preserva o
  // `Promise.allSettled` original e o degraded fallback continua em pé.
  const results = await Promise.allSettled(KICK_SLUGS.map(fetchKickChannel));
  const status: LiveStatus = {};
  KICK_SLUGS.forEach((slug, i) => {
    const r = results[i];
    if (r.status === "fulfilled") {
      status[slug] = r.value;
      return;
    }
    status[slug] = lastGoodBySlug.get(slug) ?? false;
  });
  return status;
}

const cachedLiveStatus = unstable_cache(fetchAllLive, ["kick-live-status"], {
  revalidate: LIVE_TTL_SECONDS,
  tags: ["kick-live-status"],
});

/** Uma busca em voo por vez: 30 visitas simultâneas viram 1 consulta. */
let inFlight: Promise<LiveStatus> | null = null;
let lastKnownGood: LiveStatus | null = null;

function allOffline(): LiveStatus {
  return Object.fromEntries(KICK_SLUGS.map((slug) => [slug, false]));
}

function rememberGood(status: LiveStatus): void {
  lastKnownGood = status;
  for (const [slug, isLive] of Object.entries(status)) {
    lastGoodBySlug.set(slug, isLive);
  }
}

/**
 * Status de live de todos os canais da Kick.
 *
 * Nunca lança: se a Kick inteira falhar, devolve o último status conhecido (ou
 * todos offline), para que a falha de rede não derrube a página.
 */
export async function getLiveStatus(): Promise<LiveStatus> {
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