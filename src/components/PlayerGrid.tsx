"use client";

import { useEffect, useState } from "react";
import { TEAM, type Player } from "@/data/team";
import type { LiveStatus } from "@/lib/kick";
import type { RankedSnapshot } from "@/lib/riot";
import { PlayerCard } from "./PlayerCard";

/**
 * Intervalo de revalidação dos dados no cliente (60 segundos).
 *
 * `/api/status` e `/api/ranks` agora são cacheados no servidor, então este
 * poll é barato de propósito: ele existe só para manter "ao vivo" e os elos
 * frescos na aba já aberta, não para proteger o player. O intervalo e os
 * `fetch` ficam como estão de propósito — mexer aqui trocaria os dados por uma
 * lista possivelmente servida do cache.
 */
const POLL_MS = 60_000;

export function PlayerGrid({
  initialLive,
  initialRanks,
}: {
  initialLive: LiveStatus;
  initialRanks: Record<string, RankedSnapshot[]>;
}) {
  const [live, setLive] = useState<LiveStatus>(initialLive);
  const [ranks, setRanks] = useState<Record<string, RankedSnapshot[]>>(initialRanks);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [statusRes, ranksRes] = await Promise.all([
          fetch("/api/status", { cache: "no-store" }),
          fetch("/api/ranks", { cache: "no-store" }),
        ]);

        if (statusRes.ok && !cancelled) {
          setLive((await statusRes.json()) as LiveStatus);
        }
        if (ranksRes.ok && !cancelled) {
          const data = (await ranksRes.json()) as {
            enabled: boolean;
            ranks: Record<string, RankedSnapshot[]>;
          };
          if (data.enabled) setRanks(data.ranks);
        }
      } catch {
        // Preserva o último estado conhecido
      }
    }

    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <section id="elenco" className="w-full pt-4 pb-16">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {TEAM.map((player: Player) => (
          <PlayerCard
            key={player.id}
            player={player}
            live={Boolean(player.kick && live[player.kick])}
            ranks={ranks[player.id]}
          />
        ))}
      </div>
    </section>
  );
}