import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { CoachStaffGrid } from "@/components/CoachStaffGrid";
import { liveCount } from "@/lib/live";
import { getLiveStatus } from "@/lib/live-server";
import { getCoachStaffLiveStatus } from "@/lib/coach-staff-live";
import { coachStaffLiveCount } from "@/data/coach-staff";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "COACH STAFF | Sucata in Box",
  description: "Presidentes e coaches da Sucata in Box e seus treinos ao vivo.",
};

export default async function CoachStaffPage() {
  const [staffStatus, rosterStatus] = await Promise.all([
    getCoachStaffLiveStatus(),
    getLiveStatus(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        totalLive={liveCount(rosterStatus)}
        staffLive={coachStaffLiveCount(staffStatus)}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 md:py-14">
        <header className="mb-10 border-b border-hairline pb-7">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-accent">
            Liderança e comissão técnica
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
            COACH STAFF
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-subtle">
            Presidentes e coaches da Sucata in Box.
          </p>
        </header>

        <CoachStaffGrid initialStatus={staffStatus} />
      </main>

      <Footer />
    </div>
  );
}
