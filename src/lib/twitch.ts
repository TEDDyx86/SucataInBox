import { unstable_cache } from "next/cache";
import { TEAM, liveHandle } from "@/data/team";

/**
 * Credenciais do app no console da Twitch (dev.twitch.tv/console/apps).
 *
 * A Twitch não tem API pública sem autenticação — todo endpoint Helix exige
 * token — então, diferente da Kick, esta integração depende de duas variáveis
 * de ambiente. Sem elas a página continua funcionando: os canais da Twitch
 * simplesmente não entram no mapa de status.
 *
 * O Client Secret só é usado no servidor. Nunca importar este módulo de um
 * componente `"use client"`, ou o secret vaza no bundle.
 */
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID?.trim();
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET?.trim();

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const STREAMS_URL = "https://api.twitch.tv/helix/streams";

/**
 * Logins na Twitch, derivados do elenco pelo social de plataforma `twitch`.
 * `Set` porque dois jogadores com o mesmo canal não devem virar dois parâmetros
 * na mesma requisição.
 */
const TWITCH_LOGINS = [
  ...new Set(TEAM.map((p) => liveHandle(p, "twitch")).filter((l): l is string => Boolean(l))),
];

/** Canais da Twitch keyedados como `twitch:<login>`, no formato do agregador. */
type TwitchLive = Record<string, boolean>;

type HelixStream = {
  user_login?: string;
  /** Discriminador documentado: "live" quando transmitindo, "" quando offline. */
  type?: string;
};

type HelixStreams = { data?: HelixStream[] };

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
};

/**
 * TTL curto: o mesmo da Kick (90s) porque é o mesmo dado — live é mais volátil
 * que ranque, mas 90s já corta ~99% do tráfego repetido, já que a página e o
 * poll do browser batem no mesmo cache.
 */
const LIVE_TTL_SECONDS = 90;

/**
 * Fallback quando a Twitch não manda `expires_in`. O valor documentado é ~58
 * dias (5011271s); assumimos um dia para sermos conservadores e deixarmos o
 * retry de 401 cobrir o caso de o token morrer mais cedo do que o previsto.
 */
const FALLBACK_TOKEN_TTL_SECONDS = 86_400;

/**
 * Renova o token antes do prazo real em vez de descobrir a expiração num 401:
 * o corte evita que a janela entre o token expirar e a renovação caber num
 * cache de 90s e derrubar o badge de todo mundo ao mesmo tempo.
 */
const TOKEN_EXPIRY_SKEW_MS = 60_000;

/* -------------------------------------------------------------------------- */
/* Token (Client Credentials)                                                  */
/* -------------------------------------------------------------------------- */

type CachedToken = { token: string; expiresAt: number };

/**
 * Token em memória do módulo, e não no `unstable_cache` de baixo: o cache
 * incremental persiste em disco e não tem como ser invalidado, então um secret
 * rotacionado continuaria servindo token morto indefinidamente. O custo de
 * manter em memória é um token a mais por cold start da função serverless, o
 * que é barato e é o trade-off certo.
 */
let cachedToken: CachedToken | null = null;

/** Requisições de token em voo: N chamadas simultâneas viram 1 POST. */
let tokenInFlight: Promise<string> | null = null;

function invalidateToken(): void {
  cachedToken = null;
}

async function requestToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID!,
      client_secret: TWITCH_CLIENT_SECRET!,
      // Fluxo server-to-server: não pede escopo nenhum e não depende de
      // permissão de nenhum jogador.
      grant_type: "client_credentials",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Twitch token HTTP ${res.status}`);

  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    throw new Error("Twitch token: resposta sem access_token");
  }

  cachedToken = {
    token: data.access_token,
    expiresAt:
      Date.now() +
      (data.expires_in ?? FALLBACK_TOKEN_TTL_SECONDS) * 1000 -
      TOKEN_EXPIRY_SKEW_MS,
  };
  return data.access_token;
}

/**
 * App Access Token, emitido pelo fluxo Client Credentials.
 *
 * Existe porque a chamada Helix precisa do header `Authorization`, e o token é
 * de ~58 dias: guardar em memória com `expiresAt` evita um POST por consulta,
 * enquanto o `tokenInFlight` garante que 30 visitas simultâneas ainda resultem
 * em um único POST.
 */
async function getAppAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  tokenInFlight ??= requestToken().finally(() => {
    tokenInFlight = null;
  });
  return tokenInFlight;
}

/* -------------------------------------------------------------------------- */
/* Consulta de live                                                            */
/* -------------------------------------------------------------------------- */

function key(login: string): string {
  return `twitch:${login}`;
}

async function requestStreams(): Promise<Response> {
  // `user_login` é um parâmetro repetido, não uma lista separada por vírgula —
  // este é o motivo de o elenco inteiro caber numa requisição só.
  const params = new URLSearchParams();
  for (const login of TWITCH_LOGINS) params.append("user_login", login);
  // Teto documentado do endpoint: 100 logins por requisição. O elenco tem muito
  // menos que isso; se passar, será preciso dividir em lotes.
  params.set("first", "100");

  const token = await getAppAccessToken();
  return fetch(`${STREAMS_URL}?${params}`, {
    headers: {
      "Client-Id": TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
    },
    // O cache de fetch do Next é desligado de propósito: quem cacheia é o
    // `unstable_cache` em volta, que sobrevive entre requisições.
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
}

/**
 * Uma requisição com o elenco inteiro.
 *
 * Ao contrário da Kick, o Helix responde com uma lista do que *está* no ar, e
 * não um objeto por canal: quem não aparece na resposta é offline. Isso inverte
 * o modelo de erro da Kick — aqui uma falha derruba todos os canais da Twitch de
 * uma vez, e não um por um — mas o `lastKnownGood` abaixo cobre esse caso.
 */
async function fetchAllLive(): Promise<TwitchLive> {
  const first = await requestStreams();

  // 401 = token expirado antes do previsto ou Client Secret rotacionado. Vale
  // uma segunda tentativa com token novo; se o segundo também falhar, é erro de
  // verdade e sobe para o fallback de stale.
  if (first.status === 401) {
    invalidateToken();
    const retry = await requestStreams();
    if (!retry.ok) throw new Error(`Twitch streams HTTP ${retry.status}`);
    return parseStreams((await retry.json()) as HelixStreams);
  }
  if (!first.ok) throw new Error(`Twitch streams HTTP ${first.status}`);

  return parseStreams((await first.json()) as HelixStreams);
}

function parseStreams(payload: HelixStreams): TwitchLive {
  const liveLogins = new Set(
    (payload.data ?? [])
      .filter((s) => s.type === "live" && s.user_login)
      .map((s) => s.user_login!.toLowerCase()),
  );
  return Object.fromEntries(TWITCH_LOGINS.map((login) => [key(login), liveLogins.has(login)]));
}

const cachedLiveStatus = unstable_cache(fetchAllLive, ["twitch-live-status"], {
  revalidate: LIVE_TTL_SECONDS,
  tags: ["twitch-live-status"],
});

/** Uma busca em voo por vez: 30 visitas simultâneas viram 1 consulta. */
let inFlight: Promise<TwitchLive> | null = null;
let lastKnownGood: TwitchLive | null = null;

function allOffline(): TwitchLive {
  return Object.fromEntries(TWITCH_LOGINS.map((login) => [key(login), false]));
}

function rememberGood(status: TwitchLive): void {
  lastKnownGood = status;
}

/**
 * Status de live dos canais da Twitch, keyedado como `twitch:<login>`.
 *
 * Nunca lança, com a mesma degradação da Kick: sem credenciais, sem canais no
 * elenco, ou com a Twitch fora do ar, devolve o último status válido (ou tudo
 * offline). O badge da Kick e o resto da página seguem intactos em todos esses
 * casos — a integração com uma plataforma é opcional para as outras.
 */
export async function getTwitchLive(): Promise<TwitchLive> {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || TWITCH_LOGINS.length === 0) {
    return allOffline();
  }

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
