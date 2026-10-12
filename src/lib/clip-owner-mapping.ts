import { COACH_STAFF, type CoachStaffMember } from "../data/coach-staff";
import { TEAM, liveHandle, type LivePlatform, type Player } from "../data/team";

export type ClipOwner =
  | { type: "player"; id: string; name: string; player: Player }
  | { type: "coach_staff"; id: string; name: string; role: CoachStaffMember["role"]; member: CoachStaffMember };

/** Resolve roster players first, then configured Coach Staff channel profiles. */
export function findClipOwnerByLiveHandle(platform: LivePlatform, handle: string): ClipOwner | null {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return null;

  const player = TEAM.find((entry) => liveHandle(entry, platform)?.toLowerCase() === normalizedHandle);
  if (player) return { type: "player", id: player.id, name: player.name, player };

  const member = COACH_STAFF.find((entry) => coachStaffLiveHandle(entry, platform)?.toLowerCase() === normalizedHandle);
  return member
    ? { type: "coach_staff", id: member.id, name: member.name, role: member.role, member }
    : null;
}

export function toClipOwnerColumns(owner: ClipOwner | null) {
  return {
    player_id: owner?.type === "player" ? owner.id : null,
    coach_staff_id: owner?.type === "coach_staff" ? owner.id : null,
  };
}

export function coachStaffLiveHandle(member: CoachStaffMember, platform: LivePlatform): string | undefined {
  if (platform === "kick") {
    return new URL(member.kickUrl).pathname.split("/").filter(Boolean)[0];
  }
  const url = member.socials.find((social) => social.platform === platform)?.url;
  return url ? new URL(url).pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") : undefined;
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}
