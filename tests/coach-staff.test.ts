import { describe, expect, it } from "vitest";
import {
  COACH_STAFF,
  coachStaffKickHandle,
  coachStaffSocials,
} from "../src/data/coach-staff";

describe("Aegis Coach Staff entry", () => {
  it("belongs to Coaches and uses the supplied Kick handle", () => {
    const aegis = COACH_STAFF.find((member) => member.id === "aegis");

    expect(aegis).toBeDefined();
    expect(aegis?.name).toBe("Aegis");
    expect(aegis?.role).toBe("Coach");
    expect(aegis && coachStaffKickHandle(aegis)).toBe("aegislol1");
  });

  it("exposes Kick, Instagram, and X links on the card", () => {
    const aegis = COACH_STAFF.find((member) => member.id === "aegis");
    expect(aegis).toBeDefined();
    if (!aegis) return;

    expect(coachStaffSocials(aegis)).toEqual([
      { platform: "kick", url: "https://kick.com/aegislol1", label: "Kick" },
      {
        platform: "instagram",
        url: "https://www.instagram.com/gabriel.aegis1/",
        label: "Instagram",
      },
      { platform: "x", url: "https://x.com/Aegislol1", label: "X" },
    ]);
  });
});
