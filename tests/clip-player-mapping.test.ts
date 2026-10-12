import { describe, expect, it } from "vitest";
import { COACH_STAFF } from "../src/data/coach-staff";
import { TEAM, liveHandle } from "../src/data/team";
import { coachStaffLiveHandle, findClipOwnerByLiveHandle, toClipOwnerColumns } from "../src/lib/clip-owner-mapping";
import { getClipOwnerDisplay } from "../src/lib/clip-owner-display";
const playerMapping = await import("../src/lib/clip-player-mapping").catch(() => null);

describe("Kick channel coverage in the team roster", () => {
  it("maps YASUOCADEIRANTE to the Kick account vinnycaffe", () => {
    const player = TEAM.find((member) => member.id === "yasuocadeirante");
    expect(player?.name).toBe("YASUOCADEIRANTE");
    expect(player && liveHandle(player, "kick")).toBe("vinnycaffe");
  });

  it("confirms all eight roster members have a Kick channel", () => {
    expect(TEAM.filter((player) => liveHandle(player, "kick"))).toHaveLength(8);
    expect(TEAM).toHaveLength(8);
  });

  it("maps MYCHAMAQUEEUVOU to the configured Kick channel", () => {
    const player = TEAM.find((member) => member.id === "mychamaqueeuvou");
    expect(player?.name).toBe("MYCHAMAQUEEUVOU");
    expect(player && liveHandle(player, "kick")).toBe("my-chamaqueeuvou");
  });

  it("maps a source channel handle to the roster player for that platform", () => {
    expect(playerMapping?.findTeamPlayerByLiveHandle("kick", "VinnyCaffe")).toMatchObject({
      id: "yasuocadeirante",
      name: "YASUOCADEIRANTE",
    });
    expect(playerMapping?.findTeamPlayerByLiveHandle("twitch", "my_chamaqueeuvou")).toMatchObject({
      id: "mychamaqueeuvou",
      name: "MYCHAMAQUEEUVOU",
    });
    expect(playerMapping?.findTeamPlayerByLiveHandle("kick", "unknown_channel")).toBeNull();
  });

  it("maps configured Kick and Twitch handles to Coach Staff members", () => {
    expect(findClipOwnerByLiveHandle("kick", "JUKES")).toMatchObject({
      type: "coach_staff",
      id: "jukes",
      name: "Jukes",
      role: "Presidente",
    });
    expect(findClipOwnerByLiveHandle("kick", "vinnycaffe")).toMatchObject({
      type: "player",
      id: "yasuocadeirante",
    });
    expect(findClipOwnerByLiveHandle("kick", "unknown_channel")).toBeNull();
    expect(findClipOwnerByLiveHandle("twitch", "unknown_channel")).toBeNull();
    expect(coachStaffLiveHandle({
      ...COACH_STAFF[0],
      socials: [...COACH_STAFF[0].socials, { platform: "twitch", url: "https://twitch.tv/JukesLive", label: "Twitch" }],
    }, "twitch")).toBe("JukesLive");
  });

  it("displays Coach Staff names with the shared public tag", () => {
    expect(getClipOwnerDisplay(null, "jukes")).toEqual({ name: "Jukes", tag: "Coach Staff" });
    expect(getClipOwnerDisplay("yasuocadeirante", null)).toEqual({ name: "YASUOCADEIRANTE", tag: null });
    expect(getClipOwnerDisplay(null, null)).toEqual({ name: "Jogador não atribuído", tag: null });
  });

  it("stores Coach Staff attribution separately from player attribution", () => {
    expect(toClipOwnerColumns(findClipOwnerByLiveHandle("kick", "jukes"))).toEqual({
      player_id: null,
      coach_staff_id: "jukes",
    });
    expect(toClipOwnerColumns(findClipOwnerByLiveHandle("kick", "vinnycaffe"))).toEqual({
      player_id: "yasuocadeirante",
      coach_staff_id: null,
    });
  });
});
