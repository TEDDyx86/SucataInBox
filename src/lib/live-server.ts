import { getKickLive } from "./kick";
import { getTwitchLive } from "./twitch";
import type { LiveStatus } from "./live";

/**
 * Status de live de todos os canais, em todas as plataformas.
 *
 * Server-only: este módulo é a única ponte entre a camada pura de `live.ts` e os
 * providers que falam com as APIs. Os helpers puros (`livePlatformsFor`,
 * `liveCount`) precisam ser importáveis pelos componentes `"use client"`, então
 * não podem morar aqui — se morassem, o `PlayerCard` arrastaria este arquivo e
 * com ele `kick.ts` e `twitch.ts` para o bundle do navegador.
 *
 * Nunca lança: cada provider já degrada sozinho para o último valor válido (ou
 * todos offline), então uma plataforma fora do ar não tira a outra do ar — nem
 * derruba a página. `allSettled` mantém essa garantia explícita caso um
 * provider venha a lançar por um motivo que não seja de rede.
 */
export async function getLiveStatus(): Promise<LiveStatus> {
  const [kick, twitch] = await Promise.allSettled([getKickLive(), getTwitchLive()]);
  return {
    ...(kick.status === "fulfilled" ? kick.value : {}),
    ...(twitch.status === "fulfilled" ? twitch.value : {}),
  };
}
