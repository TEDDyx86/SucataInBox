"use client";

import { useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import type { PublishedClip } from "@/lib/clips";
import { ClipPlayer } from "@/components/ClipPlayer";

type SortBy = "recent" | "views";

export function ClipsGallery({ clips }: { clips: PublishedClip[] }) {
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [selected, setSelected] = useState<PublishedClip | null>(null);
  const players = [...new Set(clips.map((clip) => clip.player_name))].sort();
  const visibleClips = clips
    .filter((clip) => playerFilter === "all" || clip.player_name === playerFilter)
    .sort((a, b) => sortBy === "views"
      ? b.view_count - a.view_count
      : Date.parse(b.source_created_at ?? b.created_at) - Date.parse(a.source_created_at ?? a.created_at));

  return (
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 sm:px-6 md:pt-14">
        <header className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b border-hairline pb-7">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-accent">Melhores momentos do elenco</p>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">CLIPES</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-subtle">Assista aos momentos do time</p>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-end justify-end gap-3">
          <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-faint">
            Ordenar
            <select
              aria-label="Ordenar clipes"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="h-11 min-w-40 rounded-lg border border-hairline bg-surface px-3 text-xs font-bold normal-case tracking-normal text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="recent">Mais recentes</option>
              <option value="views">Mais vistos</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-faint">
            Jogador
            <select
              aria-label="Filtrar por jogador"
              value={playerFilter}
              onChange={(event) => setPlayerFilter(event.target.value)}
              className="h-11 min-w-48 rounded-lg border border-hairline bg-surface px-3 text-xs font-bold normal-case tracking-normal text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="all">Todos os jogadores</option>
              {players.map((player) => <option key={player} value={player}>{player}</option>)}
            </select>
          </label>
        </div>

        {visibleClips.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleClips.map((clip) => (
              <article key={clip.id} className="overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors hover:border-accent/40">
                <button
                  type="button"
                  onClick={() => setSelected(clip)}
                  aria-label={`Assistir ${clip.title}, de ${clip.player_name}`}
                  className="group relative block aspect-video w-full overflow-hidden bg-zinc-900 text-left"
                >
                  {/* Local API redirects to a short-lived URL for the private R2 object. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={clip.source_platform === "twitch" ? clip.source_thumbnail_url ?? "" : `/api/clips/${clip.id}/thumbnail`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/40">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur">
                      <Play className="h-5 w-5 fill-current" />
                    </span>
                  </span>
                  <span className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-[10px] font-bold text-white">
                    {formatDuration(clip.duration_seconds)}
                  </span>
                </button>
                <div className="p-4">
                  <h2 className="truncate text-base font-black text-white">{clip.title}</h2>
                  <p className="mt-1 truncate text-xs font-bold text-subtle">{clip.player_name}</p>
                  <p className="mt-3 flex items-center justify-between text-[11px] text-faint">
                    <span>{clip.view_count.toLocaleString("pt-BR")} visualizações na Kick</span>
                    <time dateTime={clip.source_created_at ?? clip.created_at}>{formatAge(clip.source_created_at ?? clip.created_at)}</time>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-hairline bg-surface p-10 text-center">
            <p className="text-lg font-black text-white">Ainda não há clipes publicados.</p>
            <p className="mt-2 text-sm text-subtle">Os melhores momentos do elenco aparecem aqui quando forem importados.</p>
          </div>
        )}
      </main>

      {selected && (
        <div
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
          onKeyDown={(event) => { if (event.key === "Escape") setSelected(null); }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <section role="dialog" aria-modal="true" aria-label={`Clipe ${selected.title}`} className="w-full max-w-5xl overflow-hidden rounded-2xl border border-hairline bg-surface">
            <header className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black text-white">{selected.title}</h2>
                <p className="mt-0.5 truncate text-xs text-subtle">{selected.player_name}</p>
              </div>
              <button type="button" aria-label="Fechar reprodução" onClick={() => setSelected(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </header>
            <ClipPlayer id={selected.id} sourceClipId={selected.source_clip_id} sourcePlatform={selected.source_platform} title={selected.title} />
            <footer className="flex justify-end border-t border-hairline px-4 py-3">
              <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-hairline px-3 text-xs font-bold text-subtle transition-colors hover:text-white">
                Abrir na {selected.source_platform === "twitch" ? "Twitch" : "Kick"} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatAge(value: string): string {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000));
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}
