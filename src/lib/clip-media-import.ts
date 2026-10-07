import type { KickClipMetadata } from "./kick-source";
import type { RewrittenHlsPlaylist } from "./hls-playlist";

const MAX_PLAYLIST_BYTES = 1_000_000;
const MAX_MEDIA_OBJECT_BYTES = 32 * 1024 * 1024;
const MAX_TOTAL_MEDIA_BYTES = 100 * 1024 * 1024;
const MAX_MEDIA_OBJECTS = 100;
const IMPORT_DEADLINE_MS = 35_000;

export type ClipImportObject = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

export type ClipMediaImportDependencies = {
  fetchPlaylist: (url: string, signal: AbortSignal, maxBytes: number) => Promise<string>;
  fetchResource: (url: string, signal: AbortSignal, maxBytes: number) => Promise<Pick<ClipImportObject, "body" | "contentType">>;
  rewritePlaylist: (input: string, sourcePlaylistUrl: string, storagePrefix: string) => RewrittenHlsPlaylist;
  putObject: (object: ClipImportObject, signal: AbortSignal) => Promise<void>;
  cleanup: () => Promise<void>;
  publish: () => Promise<void>;
  markFailed: (reason: string) => Promise<void>;
};

/** Copy all parts first, then publish; failed imports stay hidden and retryable. */
export async function importKickMediaPackage(
  metadata: KickClipMetadata,
  storagePrefix: string,
  dependencies: ClipMediaImportDependencies,
): Promise<void> {
  const signal = AbortSignal.timeout(IMPORT_DEADLINE_MS);
  try {
    const playlist = await dependencies.fetchPlaylist(metadata.playlistUrl, signal, MAX_PLAYLIST_BYTES);
    const prepared = dependencies.rewritePlaylist(playlist, metadata.playlistUrl, "media");
    if (prepared.resources.length > MAX_MEDIA_OBJECTS) {
      throw new Error("A playlist contém segmentos demais para uma importação.");
    }

    let totalBytes = 0;
    for (const resource of prepared.resources) {
      const media = await dependencies.fetchResource(resource.sourceUrl, signal, MAX_MEDIA_OBJECT_BYTES);
      totalBytes += media.body.byteLength;
      if (totalBytes > MAX_TOTAL_MEDIA_BYTES) {
        throw new Error("O clipe excede o limite de armazenamento de 100 MB.");
      }
      await dependencies.putObject({
        key: `${storagePrefix}/${resource.storageName}`,
        body: media.body,
        contentType: media.contentType,
      }, signal);
    }

    const thumbnail = await dependencies.fetchResource(metadata.thumbnailUrl, signal, 4 * 1024 * 1024);
    if (!thumbnail.contentType.startsWith("image/")) {
      throw new Error("A Kick retornou uma thumbnail que não é uma imagem.");
    }
    await dependencies.putObject({
      key: `${storagePrefix}/thumbnail.webp`,
      body: thumbnail.body,
      contentType: thumbnail.contentType,
    }, signal);

    await dependencies.putObject({
      key: `${storagePrefix}/playlist.m3u8`,
      body: new TextEncoder().encode(prepared.playlist),
      contentType: "application/vnd.apple.mpegurl",
    }, signal);

    if (signal.aborted) throw new Error("O prazo de importação foi excedido.");
    await dependencies.publish();
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida na importação.";
    let failureReason = reason;
    try {
      await dependencies.cleanup();
    } catch {
      failureReason += " A limpeza dos arquivos temporários do R2 também falhou; a importação continua oculta e precisa de uma nova tentativa.";
    }
    let failureStateSaved = true;
    try {
      await dependencies.markFailed(failureReason);
    } catch {
      failureStateSaved = false;
    }
    if (!failureStateSaved) {
      failureReason += " O banco não conseguiu registrar a falha; o clipe pode continuar como importando. Remova-o pelo painel e tente importar novamente.";
    }
    throw new Error(failureReason);
  }
}
