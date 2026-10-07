import type { Metadata } from "next";
import { coachStaffLiveCount } from "@/data/coach-staff";
import { ClipsGallery } from "@/components/ClipsGallery";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getPublishedClips } from "@/lib/clips";
import { getCoachStaffLiveStatus } from "@/lib/coach-staff-live";
import { liveCount } from "@/lib/live";
import { getLiveStatus } from "@/lib/live-server";

export const metadata: Metadata = {
  title: "Clipes — SUCATA IN BOX",
  description: "Melhores momentos do elenco da SUCATA IN BOX.",
};

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const [clips, liveStatus, coachStaffStatus] = await Promise.all([
    getPublishedClips(),
    getLiveStatus(),
    getCoachStaffLiveStatus(),
  ]);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar totalLive={liveCount(liveStatus)} staffLive={coachStaffLiveCount(coachStaffStatus)} />
      <ClipsGallery clips={clips} />
      <Footer />
    </div>
  );
}
