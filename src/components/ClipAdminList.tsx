"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ManagedClip = {
  id: string;
  title: string;
  source_platform: "kick" | "twitch";
  source_url: string;
  player_id: string | null;
  player_name: string;
  status: "processing" | "published" | "failed";
  failure_reason: string | null;
  created_at: string;
};

export function ClipAdminList({ clips, players }: { clips: ManagedClip[]; players: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  async function assignPlayer(clip: ManagedClip, playerId: string) {
    setAssigning(clip.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/clips/${clip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Não foi possível atualizar o jogador do clipe.");
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setAssigning(null);
    }
  }

  async function removeClip(clip: ManagedClip) {
    if (!window.confirm(`Remover “${clip.title}” do site e apagar a cópia do R2?`)) return;
    setRemoving(clip.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/clips/${clip.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Não foi possível remover o clipe.");
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {clips.length ? (
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
          <ul className="divide-y divide-white/5">
            {clips.map((clip) => (
              <li key={clip.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{clip.title}</p>
                  <p className="mt-1 truncate text-xs text-subtle">{clip.player_name} · {new Date(clip.created_at).toLocaleString("pt-BR")}</p>
                  {clip.failure_reason && <p className="mt-2 text-xs text-red-300">{clip.failure_reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`clip-player-${clip.id}`}>Jogador de {clip.title}</label>
                  <select
                    id={`clip-player-${clip.id}`}
                    value={clip.player_id ?? ""}
                    disabled={assigning === clip.id}
                    onChange={(event) => void assignPlayer(clip, event.target.value)}
                    className="h-10 max-w-48 rounded-lg border border-hairline bg-background px-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <option value="" disabled>Selecionar jogador</option>
                    {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                  </select>
                  <a href={clip.source_url} target="_blank" rel="noopener noreferrer" className="min-h-10 rounded-lg border border-hairline px-3 py-2 text-xs font-bold text-subtle hover:text-white">{clip.source_platform === "twitch" ? "Twitch" : "Kick"}</a>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${clip.status === "published" ? "bg-emerald-500/10 text-emerald-400" : clip.status === "failed" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-200"}`}>
                    {clip.status === "published" ? "Publicado" : clip.status === "failed" ? "Falhou" : "Importando / oculto"}
                  </span>
                  <button type="button" disabled={removing === clip.id} onClick={() => removeClip(clip)} className="min-h-10 rounded-lg border border-red-500/25 px-3 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                    {removing === clip.id ? "Removendo…" : "Remover"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline bg-surface p-8 text-center text-sm text-subtle">Nenhum clipe importado.</div>
      )}
    </>
  );
}
