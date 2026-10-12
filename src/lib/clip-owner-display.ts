import { COACH_STAFF } from "../data/coach-staff";
import { TEAM } from "../data/team";

export function getClipOwnerDisplay(playerId: string | null, coachStaffId: string | null) {
  if (coachStaffId) {
    const member = COACH_STAFF.find((entry) => entry.id === coachStaffId);
    if (member) return { name: member.name, tag: "Coach Staff" as const };
  }
  if (playerId) {
    const player = TEAM.find((entry) => entry.id === playerId);
    if (player) return { name: player.name, tag: null };
  }
  return { name: "Jogador não atribuído", tag: null };
}
