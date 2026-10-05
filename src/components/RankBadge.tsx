"use client";

import Image from "next/image";
import type { RankedSnapshot } from "@/lib/riot";
import { TIER_META, tierArt, tierKeyOf, tierLabel } from "@/lib/ranks";
import { Swords, TrendingUp } from "lucide-react";

/**
 * Elo em Solo/Duo. A Rift Queue (Flex) não é exibida no card:
 * aaptamos o card para o ranque solo, que é o que compete.
 */
export function RankBadge({ snapshot }: { snapshot: RankedSnapshot }) {
  const { rank } = snapshot;

  const key = tierKeyOf(rank.tier);
  const meta = TIER_META[key];
  const art = tierArt(rank.tier);
  const label = tierLabel(rank.tier, rank.division);

  const totalGames = rank.wins + rank.losses;
  const winrate = totalGames > 0 ? Math.round((rank.wins / totalGames) * 100) : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 ring-1 ${meta.ring} ${meta.glow}`}
    >
      <div className="relative flex items-center gap-4">
        {/* Emblema do elo */}
        {art ? (
          <div className="relative flex h-[68px] w-[104px] shrink-0 items-center justify-center">
            {/* Único brilho do badge, tingido pelo tier. Antes eram duas camadas
                desfocadas (blur-3xl no canto + blur-2xl atrás do emblema), o que
                somava 16 camadas de blur no grid inteiro. `bg-current` + a classe
                de texto do tier é o que dá a cor; sem o `bg-current` o brilho
                sairia sempre vermelho. */}
            <span
              className={`pointer-events-none absolute h-10 w-20 rounded-full bg-current opacity-25 blur-xl ${meta.text}`}
            />
            <Image
              src={art.src}
              alt={`Elo ${label}`}
              width={art.width}
              height={art.height}
              className="relative h-auto max-h-[62px] w-auto max-w-[96px] object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]"
            />
          </div>
        ) : (
          <div
            className={`flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-900/80 text-[10px] font-black uppercase tracking-wider text-faint ring-1 ${meta.ring}`}
          >
            —
          </div>
        )}

        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-subtle">
            Solo / Duo
          </span>
          {/* UNRANKED cai no zinc-500 do TIER_META (4.1:1, reprova em AA);
              aqui ele é promoted para o token que passa. */}
          <span
            className={`mt-0.5 block text-lg font-black tracking-tight ${
              key === "UNRANKED" ? "text-subtle" : meta.text
            }`}
          >
            {label}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] text-subtle">
            {rank.leaguePoints} LP
          </span>
        </div>

        {totalGames > 0 && (
          <div className="shrink-0 text-right">
            <span
              className={`flex items-center justify-end gap-1 text-lg font-black tabular-nums ${
                winrate >= 50 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {winrate}%
            </span>
            <span className="block font-mono text-[11px] text-faint">
              {rank.wins}V · {rank.losses}D
            </span>
          </div>
        )}
      </div>

      {totalGames > 0 && (
        <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${winrate}%` }}
          />
        </div>
      )}

      {totalGames === 0 && rank.tier && key !== "UNRANKED" && (
        <p className="relative mt-3 flex items-center gap-1.5 text-[11px] text-faint">
          <Swords className="h-3 w-3 text-faint" />
          Sem partidas registradas nesta fila.
        </p>
      )}
    </div>
  );
}
