import { TEAM, liveHandle, type LivePlatform } from "../data/team";

/** Find a roster player by that player's configured login on a source platform. */
export function findTeamPlayerByLiveHandle(platform: LivePlatform, handle: string) {
  const normalizedHandle = handle.trim().toLowerCase();
  return TEAM.find((player) => liveHandle(player, platform)?.toLowerCase() === normalizedHandle) ?? null;
}
