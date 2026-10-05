"use client";

import Image from "next/image";
import { Swords, ArrowDown } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-8 pt-8 md:pb-12 md:pt-10">
      {/*
        Sem halos difusos atrás do conteúdo: o vermelho entra pela moldura do
        emblema e por um inset de 1px na borda superior, que lê como luz
        batendo numa chapa de metal. É o que mantém o preto sóbrio.
      */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {/* Logo Oficial em Emblema Esportivo */}
          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-2 rounded-3xl bg-accent/10 blur-2xl" />

            <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl border border-accent/40 bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_18px_40px_-24px_rgba(0,0,0,0.9)] transition-all duration-300 hover:border-accent/70 hover:scale-[1.02] sm:h-56 sm:w-56">
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
            SUCATA <span className="text-accent">IN BOX</span>
          </h1>

          {/* Botão de Ação */}
          <div className="mt-8 flex items-center justify-center">
            <a
              href="#elenco"
              className="group inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent bg-accent px-6 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-all hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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