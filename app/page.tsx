import { liveCount } from "@/lib/live";
import { getLiveStatus } from "@/lib/live-server";
import { TEAM } from "@/data/team";
import { getRanked, hasRiotKey } from "@/lib/riot";
import { getCoachStaffLiveStatus } from "@/lib/coach-staff-live";
import { coachStaffLiveCount } from "@/data/coach-staff";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { PlayerGrid } from "@/components/PlayerGrid";
import { Footer } from "@/components/Footer";
import type { RankedSnapshot } from "@/lib/riot";

// Status de live e ranques mudam o tempo todo: página sempre dinâmica.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Os providers degradam para último estado conhecido ou offline, preservando
  // a integridade da página mesmo se uma API estiver indisponível.
  const [live, coachStaffLive] = await Promise.all([
    getLiveStatus(),
    getCoachStaffLiveStatus(),
  ]);

  // Riot API: busca os ranques reais em tempo real
  const ranks: Record<string, RankedSnapshot[]> = {};
  if (hasRiotKey()) {
    const settled = await Promise.allSettled(TEAM.map((p) => getRanked(p)));
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") {
        ranks[TEAM[i].id] = r.value;
      }
    });
  }

  // Canais ao vivo somando todas as plataformas (Kick e Twitch).
  const totalLive = liveCount(live);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar totalLive={totalLive} staffLive={coachStaffLiveCount(coachStaffLive)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <Hero />
        <PlayerGrid initialLive={live} initialRanks={ranks} />
      </main>

      <Footer />
    </div>
  );
}
