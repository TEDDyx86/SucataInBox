"use client";

import Image from "next/image";
import Link from "next/link";
import { PLATFORM_CONFIG } from "@/data/social";
import { BrandIcon } from "./BrandIcon";

export function Navbar({
  totalLive = 0,
  staffLive = 0,
}: {
  totalLive?: number;
  staffLive?: number;
}) {
  const ring =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const allLive = totalLive + staffLive;
  const staffOnly = totalLive === 0 && staffLive > 0;
  const liveLabel = staffOnly ? `${staffLive} STAFF AO VIVO` : `${allLive} AO VIVO`;
  const liveAriaLabel = staffOnly
    ? `${staffLive} ${staffLive === 1 ? "pessoa" : "pessoas"} do Coach Staff ao vivo`
    : `${allLive} ${allLive === 1 ? "pessoa" : "pessoas"} ao vivo`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Logo & Marca */}
        <Link
          href="/"
          className={`flex min-h-11 min-w-0 items-center transition-transform hover:scale-102 ${ring}`}
        >
          <span className="truncate text-base font-black tracking-wider text-white">
            SUCATA <span className="text-accent">IN BOX</span>
          </span>
        </Link>

        {/* Status de Live ou Botão de Ação */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/clips"
            aria-label="Abrir clipes da equipe"
            className="inline-flex min-h-11 shrink-0 items-center justify-center px-1 text-xs font-black uppercase tracking-wider text-subtle transition-colors hover:text-white sm:px-2"
          >
            Clipes
          </Link>
          <Link
            href="/coach-staff"
            aria-label="Abrir a página Coach Staff"
            className={`inline-flex min-h-11 shrink-0 items-center justify-center px-1 text-xs font-black uppercase tracking-wider text-subtle transition-colors hover:text-white ${ring} sm:px-2`}
          >
            <span className="sm:hidden">Staff</span>
            <span className="hidden sm:inline">Coach Staff</span>
          </Link>
          <a
            href="https://discord.gg/jukes"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Entrar no Discord da Sucata in Box (abre em nova aba)"
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border sm:w-auto sm:px-3 ${PLATFORM_CONFIG.discord.bg} ${PLATFORM_CONFIG.discord.border} ${PLATFORM_CONFIG.discord.text} ${PLATFORM_CONFIG.discord.hoverBg} ${ring}`}
          >
            <BrandIcon platform="discord" className="h-5 w-5 shrink-0" />
            <span className="hidden text-xs font-bold sm:inline">Discord</span>
          </a>
          {allLive > 0 ? (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label={liveAriaLabel}
              className="flex min-h-11 min-w-0 shrink items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-950/70 px-3 py-1.5 text-xs font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] sm:min-h-0"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {/* Em telas estreitas só o ponto permanece: o texto custaria ~85px
                  que a marca precisa para não colapsar. */}
              <span className="hidden truncate sm:inline">{liveLabel}</span>
            </div>
          ) : (
            <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              <span>Line-up Oficial</span>
            </div>
          )}

          <a
            href="https://cblow.xyz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Site oficial do campeonato CBLOW (abre em nova aba)"
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-105 ${ring}`}
          >
            <Image
              src="https://cblow.xyz/logo.svg"
              alt=""
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 shrink-0 object-contain"
            />
          </a>
        </div>
      </div>
    </header>
  );
}
