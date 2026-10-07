import "server-only";
import { randomUUID } from "node:crypto";
import { importKickMediaPackage } from "@/lib/clip-media-import";
import { rewriteKickMediaPlaylist } from "@/lib/hls-playlist";
import { parseKickClipUrl } from "@/lib/kick-clips";
import { findTeamPlayerByLiveHandle } from "@/lib/clip-player-mapping";
import { resolveKickClip } from "@/lib/kick-source";
import { deleteR2Objects, hasR2Config, listR2Keys, putR2Object } from "@/lib/r2";
import { createSupabaseAdminClient, type StaffContext } from "@/lib/supabase/server";

const KICK_CDN = "clips.kick.com";

/** Import a public Kick clip and persist its complete HLS package to private R2. */
export async function importKickClip(kickUrl: string, submittedBy: StaffContext) {
  if (!hasR2Config()) throw new Error("Configure as credenciais do Cloudflare R2 antes de importar clipes.");

  const { clipId, channelSlug } = parseKickClipUrl(kickUrl);
  const player = findTeamPlayerByLiveHandle("kick", channelSlug);
  if (!player) throw new Error(`O canal Kick "${channelSlug}" não está vinculado a um jogador do elenco.`);
  const metadata = await resolveKickClip(clipId);
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("clips")
    .select("id, storage_prefix, status")
    .eq("kick_clip_id", clipId)
    .maybeSingle();
  if (lookupError) throw new Error("Não foi possível verificar se o clipe já foi importado.");
  if (existing && existing.status !== "failed") {
    throw new Error("Este clipe já está importado ou em processamento.");
  }

  const clipRecordId = existing?.id ?? randomUUID();
  const storagePrefix = `clips/${clipRecordId}`;
  const row = {
    source_platform: "kick",
    source_clip_id: clipId,
    source_url: kickUrl,
    source_thumbnail_url: null,
    source_created_at: metadata.createdAt,
    kick_clip_id: clipId,
    kick_url: kickUrl,
    player_id: player.id,
    title: metadata.title,
    channel_name: metadata.channelName,
    duration_seconds: Math.ceil(metadata.durationSeconds),
    view_count: metadata.viewCount,
    kick_created_at: metadata.createdAt,
    thumbnail_key: `${storagePrefix}/thumbnail.webp`,
    playlist_key: `${storagePrefix}/playlist.m3u8`,
    storage_prefix: storagePrefix,
    status: "processing",
    submitted_by: submittedBy.id,
    failure_reason: null,
    imported_at: null,
  };

  if (existing) {
    try {
      await deleteR2ObjectsForPrefix(existing.storage_prefix);
    } catch {
      throw new Error("Não foi possível limpar a mídia da tentativa anterior no R2. O clipe continua oculto; tente novamente.");
    }
    const { error } = await supabase.from("clips").update(row).eq("id", clipRecordId);
    if (error) throw new Error("Não foi possível reiniciar a importação deste clipe.");
  } else {
    const { error } = await supabase.from("clips").insert({ id: clipRecordId, ...row });
    if (error?.code === "23505") throw new Error("Este clipe já está importado ou em processamento.");
    if (error) throw new Error("Não foi possível registrar a importação do clipe.");
  }

  await importKickMediaPackage(metadata, storagePrefix, {
    fetchPlaylist: async (url, signal, maxBytes) => {
      const resource = await fetchKickResource(url, maxBytes, signal);
      return new TextDecoder().decode(resource.body);
    },
    fetchResource: (url, signal, maxBytes) => fetchKickResource(url, maxBytes, signal),
    rewritePlaylist: rewriteKickMediaPlaylist,
    putObject: (object, signal) => putR2Object(object, signal),
    cleanup: async () => deleteR2Objects(await listR2Keys(storagePrefix)),
    publish: async () => {
      const { error } = await supabase
        .from("clips")
        .update({ status: "published", imported_at: new Date().toISOString(), failure_reason: null })
        .eq("id", clipRecordId);
      if (error) throw new Error("O clipe foi enviado ao R2, mas não foi possível publicá-lo.");
    },
    markFailed: async (reason) => {
      await supabase.from("clips").update({ status: "failed", failure_reason: reason }).eq("id", clipRecordId);
    },
  });

  return {
    id: clipRecordId,
    title: metadata.title,
    channelName: metadata.channelName,
    playerId: player.id,
    playerName: player.name,
    durationSeconds: metadata.durationSeconds,
  };
}

async function fetchKickResource(url: string, maxBytes: number, parentSignal?: AbortSignal): Promise<{ body: Uint8Array; contentType: string }> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== KICK_CDN) {
    throw new Error("A Kick retornou um endereço de mídia não permitido.");
  }

  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: parentSignal ? AbortSignal.any([parentSignal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Falha ao baixar mídia da Kick (HTTP ${response.status}).`);
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new Error("Um dos arquivos do clipe excede o limite permitido.");
  }
  const body = await readBoundedBody(response, maxBytes);
  const responseType = response.headers.get("content-type")?.split(";")[0];
  return {
    body,
    contentType: responseType && responseType !== "application/octet-stream" ? responseType : contentTypeFor(url),
  };
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Um dos arquivos do clipe excede o limite permitido.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function contentTypeFor(url: string): string {
  const extension = new URL(url).pathname.split(".").pop()?.toLowerCase();
  if (extension === "ts") return "video/mp2t";
  if (extension === "m3u8") return "application/vnd.apple.mpegurl";
  if (extension === "webp") return "image/webp";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return "application/octet-stream";
}

async function deleteR2ObjectsForPrefix(prefix: string): Promise<void> {
  await deleteR2Objects(await listR2Keys(prefix));
}
