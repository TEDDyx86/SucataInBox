import { NextResponse } from "next/server";
import { getCoachStaffLiveStatus } from "@/lib/coach-staff-live";

export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=60";

/** GET /api/coach-staff -> status ao vivo por integrante do Coach Staff. */
export async function GET() {
  const status = await getCoachStaffLiveStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
