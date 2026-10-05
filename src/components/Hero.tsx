"use client";

import Image from "next/image";
import { Swords, ArrowDown } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-8 pt-8 md:pb-12 md:pt-10">
      {/* Luz ambiente de fundo */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]" />
      <div className="pointer-events-none absolute top-40 right-10 -z-10 h-72 w-72 rounded-full bg-amber-500/12 blur-[80px]" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {/* Logo Oficial em Emblema Esportivo */}
          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-accent via-orange-500 to-accent opacity-40 blur-2xl motion-safe:animate-pulse" />

            <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl border-2 border-accent/80 bg-white p-3 shadow-[0_0_50px_rgba(225,6,0,0.4)] transition-all duration-300 hover:scale-105 hover:border-white sm:h-56 sm:w-56">
              <Image
                src="/sucata-logo.jpg"
                alt="Logo Oficial Sucata in Box"
                width={220}
                height={220}
                priority
                className="h-full w-full object-contain object-center"
              />
            </div>
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl md:text-7xl">
            SUCATA <span className="text-accent drop-shadow-[0_0_35px_rgba(225,6,0,0.7)]">IN BOX</span>
          </h1>

          {/* Botão de Ação */}
          <div className="mt-8 flex items-center justify-center">
            <a
              href="#elenco"
              className="group inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent bg-accent px-6 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(225,6,0,0.4)] transition-all hover:bg-accent-hover hover:scale-105 hover:shadow-[0_0_40px_rgba(225,6,0,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Swords className="h-4 w-4" />
              <span>Conhecer o Elenco</span>
              <ArrowDown className="h-4 w-4 transition-transform motion-safe:group-hover:translate-y-1 motion-reduce:transition-none" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}