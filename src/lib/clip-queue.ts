import { parseKickClipUrl } from "./kick-clips";
import { parseTwitchClipUrl } from "./twitch-clip-parser";
import { findTeamPlayerByLiveHandle } from "./clip-player-mapping";

export type ClipQueueStatus = "queued" | "processing" | "completed" | "failed";
export type ClipSourcePlatform = "kick" | "twitch";

export type ClipQueueItem = {
  id: string;
  sourcePlatform: ClipSourcePlatform;
  clipId: string;
  playerId: string | null;
  playerName: string;
  sourceUrl: string;
  status: ClipQueueStatus;
  error?: string;
  title?: string;
};

export type QueueIssue = { line: number; message: string };

export function enqueueClipLinks(
  input: string,
  sourcePlatform: ClipSourcePlatform,
  existing: ClipQueueItem[],
  createId: () => string = () => crypto.randomUUID(),
): { items: ClipQueueItem[]; issues: QueueIssue[] } {
  const knownClipIds = new Set(existing.map((item) => `${item.sourcePlatform}:${item.clipId}`));
  const items: ClipQueueItem[] = [];
  const issues: QueueIssue[] = [];
  const lines = input.split(/\r?\n/);

  lines.forEach((line, index) => {
    const kickUrl = line.trim();
    if (!kickUrl) return;

    try {
      let clipId: string;
      let playerId: string | null = null;
      let playerName = "Identificando jogador pela Twitch";
      if (sourcePlatform === "kick") {
        const parsed = parseKickClipUrl(kickUrl);
        clipId = parsed.clipId;
        const player = findTeamPlayerByLiveHandle("kick", parsed.channelSlug);
        if (!player) {
          issues.push({ line: index + 1, message: `O canal Kick "${parsed.channelSlug}" não está vinculado a um jogador do elenco.` });
          return;
        }
        playerId = player.id;
        playerName = player.name;
      } else {
        clipId = parseTwitchClipUrl(kickUrl);
      }
      const sourceKey = `${sourcePlatform}:${clipId}`;
      if (knownClipIds.has(sourceKey)) {
        issues.push({ line: index + 1, message: "Este clipe já está nesta fila." });
        return;
      }
      knownClipIds.add(sourceKey);
      items.push({ id: createId(), sourcePlatform, clipId, playerId, playerName, sourceUrl: kickUrl, status: "queued" });
    } catch (error) {
      issues.push({
        line: index + 1,
        message: error instanceof Error ? error.message : "Link inválido.",
      });
    }
  });

  return { items, issues };
}

export function updateClipQueueItem(
  queue: ClipQueueItem[],
  id: string,
  update: Partial<Omit<ClipQueueItem, "id">>,
): ClipQueueItem[] {
  return queue.map((item) => item.id === id ? { ...item, ...update } : item);
}
