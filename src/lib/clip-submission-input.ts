import { parseKickClipUrl } from "./kick-clips";
import { parseTwitchClipUrl } from "./twitch-clip-parser";

export type ClipSubmissionInput = {
  sourcePlatform: "kick" | "twitch";
  sourceClipId: string;
  sourceUrl: string;
  displayName: string | null;
  displayNameConsentAt: string | null;
};

export type ClipSubmissionParseResult =
  | { ok: true; value: ClipSubmissionInput }
  | { ok: false; error: string };

const MAX_URL_LENGTH = 2048;
const MAX_DISPLAY_NAME_LENGTH = 40;

export function parseClipSubmission(input: unknown): ClipSubmissionParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Informe um link válido de clipe." };
  }

  const body = input as Record<string, unknown>;
  if (typeof body.sourceUrl !== "string") {
    return { ok: false, error: "Informe um link válido de clipe." };
  }

  const sourceUrl = body.sourceUrl.trim();
  if (!sourceUrl || sourceUrl.length > MAX_URL_LENGTH) {
    return { ok: false, error: "O link precisa ter até 2.048 caracteres." };
  }

  const rawDisplayName = body.displayName;
  if (rawDisplayName !== undefined && rawDisplayName !== null && typeof rawDisplayName !== "string") {
    return { ok: false, error: "O apelido informado é inválido." };
  }

  const displayName = typeof rawDisplayName === "string" ? rawDisplayName.trim() : "";
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { ok: false, error: "O apelido deve ter até 40 caracteres." };
  }

  if (body.consent !== undefined && typeof body.consent !== "boolean") {
    return { ok: false, error: "A confirmação do apelido é inválida." };
  }
  if (displayName && body.consent !== true) {
    return { ok: false, error: "Confirme a exibição pública do apelido." };
  }

  try {
    const kick = parseKickClipUrl(sourceUrl);
    return {
      ok: true,
      value: {
        sourcePlatform: "kick",
        sourceClipId: kick.clipId,
        sourceUrl,
        displayName: displayName || null,
        displayNameConsentAt: displayName ? new Date().toISOString() : null,
      },
    };
  } catch {
    // Try the other supported platform parser; neither accepts arbitrary hosts.
  }

  try {
    return {
      ok: true,
      value: {
        sourcePlatform: "twitch",
        sourceClipId: parseTwitchClipUrl(sourceUrl),
        sourceUrl,
        displayName: displayName || null,
        displayNameConsentAt: displayName ? new Date().toISOString() : null,
      },
    };
  } catch {
    return { ok: false, error: "Use um link público de clipe da Kick ou da Twitch." };
  }
}
