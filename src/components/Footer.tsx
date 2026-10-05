"use client";

import Image from "next/image";
import { BrandIcon } from "./BrandIcon";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-zinc-800/80 bg-background py-10 text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Marca e Logo */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-accent/60 bg-white p-1">
                <Image
                  src="/sucata-logo.jpg"
                  alt="Logo Sucata in Box"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain object-center"
                />
              </div>
              <span className="text-lg font-black tracking-wider text-white">
                SUCATA <span className="text-accent">IN BOX</span>
              </span>
            </div>
          </div>

          {/* Criador do site */}
          <a
            href="https://x.com/TEDDyrgt"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-11 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition-all hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <BrandIcon
              platform="x"
              className="h-5 w-5 shrink-0 text-zinc-300 transition-colors group-hover:text-white"
            />
            <span className="text-sm leading-tight">
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-subtle">
                Criador por
              </span>
              <span className="mt-0.5 block font-black text-zinc-100 transition-colors group-hover:text-white">
                @TEDDyrgt
              </span>
            </span>
          </a>
        </div>

        <div className="mt-8 border-t border-zinc-900 pt-6 text-center text-xs text-zinc-400">
          <p>
            © {currentYear} <strong>SUCATA IN BOX</strong> — Todos os direitos reservados.
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            League of Legends e Riot Games são marcas registradas da Riot Games, Inc. Este projeto é uma iniciativa comunitária de torcida para o CBLOW.
          </p>
        </div>
      </div>
    </footer>
  );
}
