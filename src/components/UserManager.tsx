"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ManagedUser = {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "moderator";
  created_at: string;
};

export function UserManager({ users, currentUserId }: { users: ManagedUser[]; currentUserId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.get("email"),
          password: values.get("password"),
          displayName: values.get("displayName"),
          role: values.get("role"),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Não foi possível criar a conta.");
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setPending(false);
    }
  }

  async function changeRole(id: string, role: "admin" | "moderator") {
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Não foi possível alterar a função.");
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
      router.refresh();
    }
  }

  async function removeUser(user: ManagedUser) {
    if (!window.confirm(`Remover o acesso de ${user.email}?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Não foi possível remover a conta.");
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    }
  }

  return (
    <>
      <form onSubmit={createUser} className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-black text-white">Criar acesso</h2>
        <p className="mt-1 text-sm text-subtle">O cadastro é fechado: só um admin pode criar contas.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-subtle">
            Nome
            <input name="displayName" required maxLength={80} className="h-11 rounded-lg border border-hairline bg-background px-3 text-sm text-white outline-none focus:border-accent" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-subtle">
            Email
            <input name="email" type="email" required maxLength={254} autoComplete="off" className="h-11 rounded-lg border border-hairline bg-background px-3 text-sm text-white outline-none focus:border-accent" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-subtle">
            Senha inicial (mínimo 12 caracteres)
            <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="h-11 rounded-lg border border-hairline bg-background px-3 text-sm text-white outline-none focus:border-accent" />
          </label>
          <label className="grid gap-2 text-xs font-bold text-subtle">
            Função
            <select name="role" defaultValue="moderator" className="h-11 rounded-lg border border-hairline bg-background px-3 text-sm text-white outline-none focus:border-accent">
              <option value="moderator">Moderador</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <button disabled={pending} className="mt-5 min-h-11 rounded-lg bg-accent px-4 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">
          {pending ? "Criando…" : "Criar usuário"}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Contas</h2>
          <span className="text-xs text-faint">{users.length} usuários</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
          <ul className="divide-y divide-white/5">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{user.display_name || user.email}</p>
                  <p className="mt-1 truncate text-xs text-subtle">{user.email}{user.id === currentUserId ? " · você" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Função de ${user.email}`}
                    value={user.role}
                    disabled={user.id === currentUserId}
                    onChange={(event) => changeRole(user.id, event.target.value as "admin" | "moderator")}
                    className="h-10 rounded-lg border border-hairline bg-background px-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <option value="moderator">Moderador</option>
                    <option value="admin">Admin</option>
                  </select>
                  {user.id !== currentUserId && (
                    <button type="button" onClick={() => removeUser(user)} className="min-h-10 rounded-lg border border-red-500/25 px-3 text-xs font-bold text-red-300 hover:bg-red-500/10">Remover</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
