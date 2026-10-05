"use client";

import Image from "next/image";

export function Navbar({ totalLive = 0 }: { totalLive?: number }) {
  const ring =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Logo & Marca */}
        <a
          href="#"
          className={`flex min-h-11 min-w-0 items-center gap-3 transition-transform hover:scale-102 ${ring}`}
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-accent/40 bg-white p-1 transition-colors group-hover:border-accent/70">
            <Image
              src="/sucata-logo.jpg"
              alt="Logo Sucata in Box"
              width={44}
              height={44}
              className="h-full w-full object-contain object-center"
            />
          </div>
          <div className="min-w-0 shrink">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-black tracking-wider text-white">
                SUCATA <span className="text-accent">IN BOX</span>
              </span>
              <span className="hidden shrink-0 rounded-md border border-accent/40 bg-accent/20 px-1.5 py-0.2 text-[9px] font-extrabold tracking-widest text-accent sm:inline-block">
                CBLOW
              </span>
            </div>
          </div>
        </a>

        {/* Status de Live ou Botão de Ação */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {totalLive > 0 ? (
            <a
              href="#elenco"
              aria-label={`${totalLive} transmissão(ões) ao vivo`}
              className={`flex min-h-11 min-w-0 shrink items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-950/70 px-3 py-1.5 text-xs font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-transform hover:scale-105 sm:min-h-0 ${ring}`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {/* Em telas estreitas só o ponto permanece: o texto custaria ~85px
                  que a marca precisa para não colapsar. */}
              <span className="hidden truncate sm:inline">{totalLive} AO VIVO</span>
            </a>
          ) : (
            <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              <span>Line-up Oficial</span>
            </div>
          )}

          <a
            href="#elenco"
            className={`inline-flex min-h-11 shrink items-center justify-center rounded-xl border border-accent bg-accent px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-colors hover:bg-accent-hover sm:min-h-0 sm:px-4 ${ring}`}
          >
            <span className="sm:hidden">Elenco</span>
            <span className="hidden sm:inline">Ver Jogadores</span>
          </a>
        </div>
      </div>
    </header>
  );
}