"use client";

import Image from "next/image";
import { ExternalLink, Swords } from "lucide-react";
import type { Player } from "@/data/team";
import { LANE_CONFIG, opggUrl } from "@/data/team";
import { PLATFORM_CONFIG } from "@/data/social";
import type { RankedSnapshot } from "@/lib/riot";
import { RoleIcon } from "./RoleIcon";
import { RankBadge } from "./RankBadge";
import { BrandIcon, isLivePlatform } from "./BrandIcon";

export type PlayerCardProps = {
  player: Player;
  /** true apenas se o jogador tem canal na Kick e está transmitindo. */
  live: boolean;
  /** Ranques vindos da Riot API; undefined enquanto carrega ou se indisponível. */
  ranks?: RankedSnapshot[];
};

export function PlayerCard({ player, live, ranks }: PlayerCardProps) {
  const lane = LANE_CONFIG[player.lane];
  const solo = ranks?.find((r) => r.queue === "RANKED_SOLO_5x5");

  const socials = [
    ...player.socials,
    ...(player.kick && !player.socials.some((s) => s.platform === "kick")
      ? [
          {
            platform: "kick" as const,
            url: `https://kick.com/${player.kick}`,
            label: "Kick",
          },
        ]
      : []),
  ];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/60 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_18px_50px_rgba(225,6,0,0.16)]">
      {/* Faixa lateral que acende no hover */}
      <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-accent to-amber-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* ---------- Identidade: foto redonda + nome ---------- */}
      <header className="flex items-center gap-4 p-5 pb-4">
        <div className="relative shrink-0">
          {/* Halo vermelho que acende no hover */}
          <span className="absolute inset-0 rounded-full bg-accent/25 blur-lg transition-opacity duration-300 group-hover:opacity-100 opacity-0" />

          <div
            className={`relative flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-zinc-900 transition-colors duration-300 ${
              live
                ? "border-emerald-500/70 shadow-[0_0_34px_rgba(16,185,129,0.35)]"
                : "border-accent/50 shadow-[0_0_34px_rgba(225,6,0,0.28)]"
            }`}
          >
            {player.photo ? (
              <Image
                src={player.photo}
                alt={`Foto de ${player.name}`}
                fill
                sizes="176px"
                /* A foto original é um retrato de meio-corpo (1254x1254). Para o
                   círculo mostrar o enquadramento do cblow.xyz — da cabeça ao
                   peito — sem cortar o topo, aproximamos e subimos a imagem. */
                className="scale-[1.24] -translate-y-[4%] object-cover transition-transform duration-500 group-hover:scale-[1.32]"
              />
            ) : (
              /* Placeholder: entra no lugar da foto enquanto ela não é enviada */
              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_120%,rgba(225,6,0,0.35),transparent_70%)]">
                <RoleIcon lane={player.lane} className="h-16 w-16 opacity-50" />
              </div>
            )}
          </div>

          {/* Status Ao Vivo, sobreposto à foto. É link para o canal da Kick em
              vez de `title` num span: tooltip não chega por teclado nem por
              leitor de tela, e um link anuncia o destino e é focável. A área
              de toque cresce pelo pseudo-elemento, que cabe dentro da foto
              e portanto não é cortado pelo overflow do card. */}
          {live && player.kick && (
            <a
              href={`https://kick.com/${player.kick}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver a live de ${player.name} na Kick`}
              className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-zinc-950 bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.6)] after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {/* `motion-safe:` porque o bloco global de prefers-reduced-motion
                  mata o ping; sem ele o badge sólido já segura o estado "ao vivo". */}
              <span className="h-2.5 w-2.5 motion-safe:animate-ping rounded-full bg-white/80" />
            </a>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl leading-tight font-black tracking-tight text-white transition-colors group-hover:text-accent">
            {player.name}
          </h3>

          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${lane.badgeBg} ${lane.badgeBorder} ${lane.color}`}
          >
            <RoleIcon lane={player.lane} className="h-3 w-3" />
            {lane.label}
          </span>
        </div>
      </header>

      {/* ---------- Corpo ---------- */}
      <div className="flex flex-1 flex-col gap-5 px-5 pb-5">
        {/* Elo Solo/Duo */}
        <section>
          <h4 className="mb-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-subtle">
            Elo Competitivo
          </h4>
          {solo ? (
            <RankBadge snapshot={solo} />
          ) : (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-center">
              <p className="text-xs font-semibold text-zinc-400">
                Ranque em sincronização com a Riot.
              </p>
              <p className="mt-1 text-[11px] text-faint">
                Histórico completo no OP.GG.
              </p>
            </div>
          )}
        </section>

        {/* Campeões Assinatura */}
        {player.favoriteChampions && player.favoriteChampions.length > 0 && (
          <section>
            <h4 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-subtle">
              <Swords className="h-3 w-3 text-accent" />
              Assinaturas
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {player.favoriteChampions.map((champ) => (
                /* Span puro: sem hover de borda/texto, porque um chip que reage
                   ao ponteiro promete um clique que não existe. */
                <span
                  key={champ}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1 text-[11px] font-bold text-zinc-200"
                >
                  {champ}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Redes + OP.GG */}
        <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-4">
          {socials.map((s) => {
            const config = PLATFORM_CONFIG[s.platform];
            const isLive = isLivePlatform(s.platform);
            return (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={isLive ? `Ver a live de ${player.name}` : s.label}
                /* Alvo de toque concedido só onde ele importa: `min-h-11` dá 44px de
                   altura no celular e `sm:min-h-0` devolve o py-1.5 original
                   no desktop, para não inflar a fileira de ações. */
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-0 ${config.bg} ${config.border} ${config.text} ${config.hoverBg}`}
              >
                <BrandIcon platform={s.platform} className="h-4 w-4 shrink-0" />
                {s.label}
                {isLive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                )}
              </a>
            );
          })}

          <a
            href={opggUrl(player)}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver o perfil completo no OP.GG"
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-zinc-700/70 bg-zinc-900 px-3 py-1.5 text-xs font-black text-zinc-300 transition-all hover:border-accent hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-0"
          >
            OP.GG
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </footer>
      </div>
    </article>
  );
}
