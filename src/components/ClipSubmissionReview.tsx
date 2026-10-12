"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, LoaderCircle, RotateCw, Trash2 } from "lucide-react";
import type { ModerationSubmission } from "@/lib/clip-submission-moderation";

const STALE_AFTER_MS = 2 * 60 * 1000;

export function ClipSubmissionReview({ submissions, now }: { submissions: ModerationSubmission[]; now: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pendingCount = submissions.filter((submission) => submission.status === "pending").length;
  const failedCount = submissions.filter((submission) => submission.status === "failed").length;

  async function act(submission: ModerationSubmission, action: "approve" | "retry" | "reject") {
    if (action === "reject") {
      const prompt = submission.cleanup_error
        ? "A exclusão anterior falhou. Tentar novamente a remoção permanente desta submissão e da mídia parcial?"
        : "Rejeitar esta submissão? Ela e qualquer mídia parcial serão apagadas permanentemente.";
      if (!window.confirm(prompt)) return;
    }

    setBusy(`${submission.id}:${action}`);
    setError("");
    try {
      const response = await fetch(`/api/admin/clip-submissions/${submission.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) setError(result.error ?? "Não foi possível atualizar esta submissão.");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="community-queue-title" className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="community-queue-title" className="text-lg font-black text-white">Fila da comunidade</h2>
          <p className="mt-1 text-xs text-subtle">Revise os links antes de importar e publicar.</p>
        </div>
        <p className="text-xs text-faint">{pendingCount} pendentes · {failedCount} com falha</p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {submissions.length ? (
        <ul className="divide-y divide-white/5 rounded-2xl border border-hairline bg-surface">
          {submissions.map((submission) => {
            const stale = submission.status === "processing" && submission.processing_started_at !== null &&
              Date.parse(now) - Date.parse(submission.processing_started_at) >= STALE_AFTER_MS;
            const isBusy = busy?.startsWith(`${submission.id}:`) ?? false;
            const statusText = submission.cleanup_error
              ? "Falha ao excluir"
              : submission.status === "pending" ? "Pendente" : submission.status === "failed" ? "Falha no processamento"
                : stale ? "Processamento parado" : "Processando";

            return (
              <li key={submission.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={submission.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1.5 text-sm font-bold text-white underline decoration-white/25 underline-offset-4 hover:text-accent">
                      {submission.source_platform === "twitch" ? "Twitch" : "Kick"} · {submission.source_clip_id}
                    </a>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${submission.status === "failed" ? "bg-red-500/10 text-red-300" : submission.status === "pending" ? "bg-amber-500/10 text-amber-200" : "bg-white/5 text-subtle"}`}>
                      {statusText}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    {submission.display_name ? `Apelido: ${submission.display_name} · ` : ""}
                    Recebido em {new Date(submission.created_at).toLocaleString("pt-BR")}
                  </p>
                  {submission.failure_reason && <p className="mt-2 text-xs text-red-300">{submission.failure_reason}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {submission.status === "pending" && (
                    <button type="button" disabled={isBusy} onClick={() => void act(submission, "approve")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-black text-black disabled:opacity-50">
                      {busy === `${submission.id}:approve` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Aprovar
                    </button>
                  )}
                  {(submission.status === "failed" || stale) && !submission.cleanup_error && (
                    <button type="button" disabled={isBusy} onClick={() => void act(submission, "retry")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-50">
                      {busy === `${submission.id}:retry` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                      {stale ? "Recuperar" : "Tentar novamente"}
                    </button>
                  )}
                  {(submission.status === "pending" || submission.status === "failed" || stale) && (
                    <button type="button" disabled={isBusy} onClick={() => void act(submission, "reject")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-500/25 px-3 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                      {busy === `${submission.id}:reject` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {submission.cleanup_error ? "Tentar excluir" : "Rejeitar"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-hairline bg-surface p-7 text-sm text-subtle">Nenhuma submissão aguardando revisão.</div>
      )}
    </section>
  );
}
