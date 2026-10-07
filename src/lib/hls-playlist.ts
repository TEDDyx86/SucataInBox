import { createHash } from "node:crypto";

const KICK_MEDIA_HOST = "clips.kick.com";
const MEDIA_EXTENSION = /^\.(?:ts|m4s|mp4|aac|m4a|vtt)$/i;

export type HlsResource = {
  sourceUrl: string;
  storageName: string;
};

export type RewrittenHlsPlaylist = {
  playlist: string;
  resources: HlsResource[];
};

/**
 * Validate a finite Kick media playlist and replace its source resources with
 * relative paths that can be stored beside the manifest in private R2.
 */
export function rewriteKickMediaPlaylist(
  input: string,
  sourcePlaylistUrl: string,
  storagePrefix: string,
): RewrittenHlsPlaylist {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "#EXTM3U") {
    throw new Error("A resposta da Kick não é uma playlist HLS válida.");
  }
  if (!lines.some((line) => line.trim() === "#EXT-X-ENDLIST")) {
    throw new Error("Só é possível importar clipes HLS finalizados.");
  }
  if (lines.some((line) => /^#EXT-X-STREAM-INF:/i.test(line.trim()))) {
    throw new Error("A Kick retornou uma playlist HLS master não suportada.");
  }

  const resourcesByUrl = new Map<string, HlsResource>();
  const prefix = storagePrefix.replace(/\/+$/, "");
  if (!/^[a-z0-9/_-]+$/i.test(prefix)) {
    throw new Error("Prefixo de armazenamento inválido.");
  }

  const rewriteUri = (uri: string): string => {
    const sourceUrl = new URL(uri, sourcePlaylistUrl);
    if (sourceUrl.protocol !== "https:" || sourceUrl.hostname.toLowerCase() !== KICK_MEDIA_HOST) {
      throw new Error("A playlist contém uma mídia fora do CDN permitido da Kick.");
    }

    let resource = resourcesByUrl.get(sourceUrl.href);
    if (!resource) {
      const extension = sourceUrl.pathname.match(/\.[^./]+$/)?.[0] ?? "";
      if (!MEDIA_EXTENSION.test(extension)) {
        throw new Error("A playlist contém um tipo de mídia não suportado.");
      }
      const hash = createHash("sha256").update(sourceUrl.href).digest("hex");
      resource = { sourceUrl: sourceUrl.href, storageName: `${prefix}/${hash}${extension.toLowerCase()}` };
      resourcesByUrl.set(sourceUrl.href, resource);
    }
    return resource.storageName;
  };

  const rewrittenLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      if (/^#EXT-X-KEY:/i.test(trimmed) && !/\bMETHOD=NONE\b/i.test(trimmed)) {
        throw new Error("Clipes HLS criptografados não podem ser importados.");
      }
      return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${rewriteUri(uri)}"`);
    }
    return rewriteUri(trimmed);
  });

  if (resourcesByUrl.size === 0) {
    throw new Error("A playlist não contém segmentos de vídeo.");
  }

  return { playlist: rewrittenLines.join("\n"), resources: [...resourcesByUrl.values()] };
}
