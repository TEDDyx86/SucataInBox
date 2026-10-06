import {
  LIVE_PLATFORMS,
  TEAM,
  liveHandle,
  type LivePlatform,
  type Player,
} from "@/data/team";

/**
 * Status de live por plataforma e canal, ex.: `{ "kick:glub-lol": true,
 * "twitch:aninha_gameplay_trynda": false }`.
 *
 * A chave carrega a plataforma de propósito: um slug da Kick e um login da
 * Twitch são ambos identificadores opacos e nada impede que um dia tenham o
 * mesmo texto, o que faria um sobrescrever o outro sem aviso.
 *
 * Este módulo é puro — só tipos e funções sobre `Player` — e por isso pode ser
 * importado tanto pelo servidor quanto pelos componentes `"use client"`. A
 * camada que fala com as APIs mora em `live-server.ts`, e manter a separação é
 * o que impede o código de leitura das credenciais de acabar no bundle do
 * navegador quando um componente precisa apenas destes helpers.
 */
export type LiveStatus = Record<string, boolean>;

/** Chave canônica de um canal no mapa de status. */
export function liveKey(platform: LivePlatform, handle: string): string {
  // O handle já vem normalizado em `liveHandle`, mas normalizar aqui também
  // protege a chave de qualquer outro chamador.
  return `${platform}:${handle.toLowerCase()}`;
}

/**
 * Plataformas de live em que o jogador está transmitindo agora.
 *
 * Fica aqui, e não nos componentes, para que `app/page.tsx` (contagem do navbar)
 * e `PlayerCard` (anel e badge) compartilhem exatamente a mesma regra.
 */
export function livePlatformsFor(
  player: Player,
  status: LiveStatus,
): LivePlatform[] {
  return LIVE_PLATFORMS.filter((platform) => {
    const handle = liveHandle(player, platform);
    return handle ? Boolean(status[liveKey(platform, handle)]) : false;
  });
}

/**
 * Quantos jogadores do elenco estão ao vivo, contando cada pessoa uma vez
 * mesmo que esteja transmitindo em mais de uma plataforma.
 */
export function liveCount(status: LiveStatus): number {
  return TEAM.filter((player) => livePlatformsFor(player, status).length > 0).length;
}
