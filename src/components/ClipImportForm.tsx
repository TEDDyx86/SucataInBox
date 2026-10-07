"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  enqueueClipLinks,
  updateClipQueueItem,
  type ClipQueueItem,
  type ClipSourcePlatform,
  type QueueIssue,
} from "@/lib/clip-queue";

export function ClipImportForm() {
  const router = useRouter();
  const queueRef = useRef<ClipQueueItem[]>([]);
  const runningRef = useRef(false);
  const [queue, setQueue] = useState<ClipQueueItem[]>([]);
  const [input, setInput] = useState("");
  const [issues, setIssues] = useState<QueueIssue[]>([]);
  const [sourcePlatform, setSourcePlatform] = useState<ClipSourcePlatform>("kick");

  function replaceQueue(update: (current: ClipQueueItem[]) => ClipQueueItem[]) {
    const next = update(queueRef.current);
    queueRef.current = next;
    setQueue(next);
  }

  async function processQueue() {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      while (true) {
        const next = queueRef.current.find((item) => item.status === "queued");
        if (!next) break;

        replaceQueue((current) => updateClipQueueItem(current, next.id, { status: "processing", error: undefined }));
        try {
          const response = await fetch("/api/admin/clips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourcePlatform: next.sourcePlatform, sourceUrl: next.sourceUrl }),
          });
          const result = await response.json() as { error?: string; clip?: { title?: string; playerId?: string; playerName?: string } };
          if (!response.ok) throw new Error(result.error ?? "Não foi possível importar o clipe.");
          replaceQueue((current) => updateClipQueueItem(current, next.id, {
            status: "completed",
            title: result.clip?.title,
            playerId: result.clip?.playerId ?? next.playerId,
            playerName: result.clip?.playerName ?? next.playerName,
            error: undefined,
          }));
        } catch (error) {
          replaceQueue((current) => updateClipQueueItem(current, next.id, {
            status: "failed",
            error: error instanceof Error ? error.message : "Não foi possível conectar ao servidor.",
          }));
        }
      }
    } finally {
      runningRef.current = false;
      router.refresh();
    }
  }

  function addToQueue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = enqueueClipLinks(input, sourcePlatform, queueRef.current);
    setIssues(result.issues);
    if (result.items.length === 0) return;

    replaceQueue((current) => [...current, ...result.items]);
    setInput("");
    void processQueue();
  }

  function retry(item: ClipQueueItem) {
    replaceQueue((current) => updateClipQueueItem(current, item.id, { status: "queued", error: undefined }));
    void processQueue();
  }

  function remove(item: ClipQueueItem) {
    if (item.status === "processing") return;
    replaceQueue((current) => current.filter((queued) => queued.id !== item.id));
  }

  const counts = {
    queued: queue.filter((item) => item.status === "queued").length,
    processing: queue.filter((item) => item.status === "processing").length,
    completed: queue.filter((item) => item.status === "completed").length,
    failed: queue.filter((item) => item.status === "failed").length,
  };

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-black text-white">Fila de importação</h2>
      <p className="mt-1 text-sm text-subtle">
        Escolha a plataforma e cole um ou mais links, um por linha. O jogador é identificado pelo canal de origem.
      </p>

      <form onSubmit={addToQueue} className="mt-4">
        <div className="mb-3 max-w-sm">
          <label htmlFor="clip-source-platform" className="grid gap-1.5 text-xs font-bold text-subtle">
            Plataforma do clipe
            <select
              id="clip-source-platform"
              value={sourcePlatform}
              onChange={(event) => setSourcePlatform(event.target.value as ClipSourcePlatform)}
              className="h-11 rounded-lg border border-hairline bg-background px-3 text-sm text-white outline-none focus:border-accent"
            >
              <option value="kick">Kick · importação para R2</option>
              <option value="twitch">Twitch · embed oficial</option>
            </select>
          </label>
        </div>
        <label htmlFor="source-clip-queue" className="sr-only">Links dos clipes</label>
        <textarea
          id="source-clip-queue"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          maxLength={20_000}
          placeholder={sourcePlatform === "kick"
            ? "https://kick.com/jogador/clips/clip_…\nhttps://kick.com/outro-jogador/clips/clip_…"
            : "https://clips.twitch.tv/ClipSlug…\nhttps://www.twitch.tv/canal/clip/ClipSlug…"}
          className="w-full resize-y rounded-lg border border-hairline bg-background px-3 py-3 text-sm text-white outline-none focus:border-accent"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-faint">{counts.queued} aguardando · {counts.processing} importando · {counts.completed} concluídos · {counts.failed} falhas</p>
          <button disabled={!input.trim()} className="min-h-11 rounded-lg bg-accent px-5 text-xs font-black uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            Adicionar à fila
          </button>
        </div>
      </form>

      {issues.length > 0 && (
        <ul aria-label="Links não adicionados à fila" className="mt-4 space-y-1 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3 text-xs text-amber-100">
          {issues.map((issue, index) => <li key={`${issue.line}-${index}`}>Linha {issue.line}: {issue.message}</li>)}
        </ul>
      )}

      {queue.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-xl border border-hairline">
          <ul aria-label="Fila de clipes" className="divide-y divide-white/5">
            {queue.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{item.title ?? item.clipId}</p>
                  <p className="mt-1 text-[11px] font-bold text-subtle">{item.playerName}</p>
                  <p className="mt-1 truncate text-[11px] text-faint">{item.sourceUrl}</p>
                  {item.error && <p role="alert" className="mt-2 text-xs text-red-300">{item.error}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${queueStatusClass(item.status)}`}>
                    {queueStatusLabel(item.status)}
                  </span>
                  {item.status === "failed" && (
                    <button type="button" onClick={() => retry(item)} className="min-h-9 rounded-lg border border-accent/30 px-2.5 text-[10px] font-bold text-white hover:bg-accent/10">
                      Tentar novamente
                    </button>
                  )}
                  {item.status !== "processing" && (
                    <button type="button" onClick={() => remove(item)} aria-label={`Remover ${item.clipId} da fila`} className="min-h-9 rounded-lg border border-hairline px-2.5 text-[10px] font-bold text-subtle hover:text-white">
                      Remover
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {counts.completed > 0 && counts.queued === 0 && counts.processing === 0 && (
            <div className="flex justify-end border-t border-hairline px-3 py-2">
              <button type="button" onClick={() => replaceQueue((current) => current.filter((item) => item.status !== "completed"))} className="min-h-9 text-xs font-bold text-subtle hover:text-white">
                Limpar concluídos
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function queueStatusLabel(status: ClipQueueItem["status"]): string {
  if (status === "queued") return "Na fila";
  if (status === "processing") return "Importando";
  if (status === "completed") return "Concluído";
  return "Falhou";
}

function queueStatusClass(status: ClipQueueItem["status"]): string {
  if (status === "queued") return "bg-zinc-500/10 text-zinc-300";
  if (status === "processing") return "bg-amber-500/10 text-amber-200";
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400";
  return "bg-red-500/10 text-red-300";
}
