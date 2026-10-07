import { describe, expect, it } from "vitest";
import { TEAM, liveHandle } from "../src/data/team";
const playerMapping = await import("../src/lib/clip-player-mapping").catch(() => null);

describe("Kick channel coverage in the team roster", () => {
  it("maps YASUOCADEIRANTE to the Kick account vinnycaffe", () => {
    const player = TEAM.find((member) => member.id === "yasuocadeirante");
    expect(player?.name).toBe("YASUOCADEIRANTE");
    expect(player && liveHandle(player, "kick")).toBe("vinnycaffe");
  });

  it("confirms seven of the eight roster members have a Kick channel", () => {
    expect(TEAM.filter((player) => liveHandle(player, "kick"))).toHaveLength(7);
    expect(TEAM).toHaveLength(8);
  });

  it("identifies MYCHAMAQUEEUVOU as the roster member without a Kick channel", () => {
    const player = TEAM.find((member) => member.id === "mychamaqueeuvou");
    expect(player?.name).toBe("MYCHAMAQUEEUVOU");
    expect(player && liveHandle(player, "kick")).toBeUndefined();
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
});
