"use client";

import { Wrench, Zap, Flame, Trophy, ShieldAlert, Cpu } from "lucide-react";

export function AboutSection() {
  const pillars = [
    {
      icon: Wrench,
      title: "Mecânica Rústica",
      color: "text-amber-400",
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
      description:
        "Ousadia pura em cada jogada. O adversário nunca consegue prever a nossa estratégia porque nós mesmos estamos decidindo na hora!",
    },
    {
      icon: Zap,
      title: "Macro Imprevisível",
      color: "text-sky-400",
      border: "border-sky-500/30",
      bg: "bg-sky-500/10",
      description:
        "Chamadas de Barão no escuro, backdoor no desespero e lutas em equipe caóticas onde tudo pode acontecer.",
    },
    {
      icon: Flame,
      title: "Espírito de Sucata",
      color: "text-[#FF2A36]",
      border: "border-[#FF2A36]/30",
      bg: "bg-[#FF2A36]/10",
      description:
        "Cada derrota vira peça de reposição. Juntamos os pedaços, ajustamos as engrenagens e voltamos mais fortes para o próximo confronto.",
    },
  ];

  return (
    <section id="sobre" className="w-full pt-16 pb-12">
      <div className="rounded-3xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 via-[#0d0e12] to-zinc-950 p-6 sm:p-10 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Cpu className="h-3.5 w-3.5" />
            <span>Nossa Filosofia</span>
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-zinc-50 sm:text-4xl">
            A Força do Metal no <span className="text-[#FF2A36]">CBLOW</span>
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
            O <strong className="text-white">SUCATA IN BOX</strong> nasceu do verdadeiro amor pelo
            League of Legends: a resiliência dos low elos. Longe dos holofotes do meta engessado, nossa equipe abraça o caos com técnica rústica, criatividade e muita vontade de vencer na <strong className="text-[#FF2A36]">Copa Brasil Low Elo</strong>.
          </p>
        </div>

        {/* 3 Pilares */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className={`relative flex flex-col justify-between rounded-2xl border ${pillar.border} bg-zinc-950/70 p-6 transition-transform hover:-translate-y-1`}
              >
                <div>
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${pillar.border} ${pillar.bg} ${pillar.color} mb-4`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100">{pillar.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Banner do Torneio */}
        <div id="torneio" className="mt-10 flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#FF2A36]/30 bg-gradient-to-r from-[#FF2A36]/10 via-zinc-900 to-zinc-950 p-6 sm:flex-row sm:p-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF2A36]">
              <Trophy className="h-4 w-4" />
              <span></span>
            </div>
            <h4 className="mt-1 text-xl font-black text-white">
              O Campeonato Mais Disputado do Brasil
            </h4>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
              O CBLOW reúne os times e personalidades mais apaixonados do cenário. Transmissões ao vivo, rivalidades intensas e entretenimento do mais alto nível.
            </p>
          </div>

          <a
            href="#elenco"
            className="shrink-0 rounded-xl border border-[#FF2A36] bg-[#FF2A36] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all hover:bg-[#d00500]"
          >
            Acompanhar Time
          </a>
        </div>
      </div>
    </section>
  );
}
