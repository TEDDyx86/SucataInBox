import { unstable_cache } from "next/cache";
import { COACH_STAFF, coachStaffKickHandle, type CoachStaffLiveStatus } from "@/data/coach-staff";

type KickStaffChannel = {
  livestream?: {
    is_live?: boolean | null;
  } | null;
  user?: {
    profile_pic?: string | null;
  } | null;
};

const STAFF_LIVE_TTL_SECONDS = 90;
const KICK_CHANNEL_URL = "https://kick.com/api/v2/channels";

/** Retém a última resposta boa por pessoa para uma falha isolada não piscar offline. */
const lastGoodById = new Map<string, CoachStaffLiveStatus[string]>();

async function fetchStaffMember(id: string, handle: string) {
  const response = await fetch(`${KICK_CHANNEL_URL}/${encodeURIComponent(handle)}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Kick ${handle}: HTTP ${response.status}`);

  const channel = (await response.json()) as KickStaffChannel;
  const isLive = Boolean(channel.livestream?.is_live);
  const avatarUrl = channel.user?.profile_pic ?? undefined;

  return {
    id,
    status: {
      isLive,
      avatarUrl: avatarUrl && isTrustedKickAvatar(avatarUrl) ? avatarUrl : undefined,
    },
  } as const;
}

function isTrustedKickAvatar(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "files.kick.com";
  } catch {
    return false;
  }
}

async function fetchAllStaffLive(): Promise<CoachStaffLiveStatus> {
  const results = await Promise.allSettled(
    COACH_STAFF.map((member) =>
      fetchStaffMember(member.id, coachStaffKickHandle(member)),
    ),
  );

  const status: CoachStaffLiveStatus = {};
  results.forEach((result, index) => {
    const member = COACH_STAFF[index];
    if (result.status === "fulfilled") {
      status[member.id] = result.value.status;
      return;
    }
    status[member.id] = lastGoodById.get(member.id) ?? {
      isLive: false,
    };
  });
  return status;
}

const cachedStaffLiveStatus = unstable_cache(
  fetchAllStaffLive,
  ["coach-staff-kick-live"],
  {
    revalidate: STAFF_LIVE_TTL_SECONDS,
    tags: ["coach-staff-kick-live"],
  },
);

let inFlight: Promise<CoachStaffLiveStatus> | null = null;
let lastKnownGood: CoachStaffLiveStatus | null = null;

function allOffline(): CoachStaffLiveStatus {
  return Object.fromEntries(
    COACH_STAFF.map((member) => [member.id, { isLive: false }]),
  );
}

/**
 * Busca presidentes e coaches sem deixar uma falha de rede de um canal derrubar
 * os demais cards. O status fica em cache por 90s; o cliente atualiza a tela a
 * cada 60s, alinhado ao monitor de lives do elenco.
 */
export async function getCoachStaffLiveStatus(): Promise<CoachStaffLiveStatus> {
  inFlight ??= cachedStaffLiveStatus().finally(() => {
    inFlight = null;
  });

  try {
    const status = await inFlight;
    lastKnownGood = status;
    for (const [id, live] of Object.entries(status)) lastGoodById.set(id, live);
    return status;
  } catch {
    return lastKnownGood ?? allOffline();
  }
}
