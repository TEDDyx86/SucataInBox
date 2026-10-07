"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Não foi possível entrar.");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="grid gap-2 text-xs font-bold text-subtle">
        Email
        <input name="email" type="email" autoComplete="username" required className="h-12 rounded-lg border border-hairline bg-background px-3 text-sm text-white outline-none focus:border-accent" />
      </label>
      <label className="grid gap-2 text-xs font-bold text-subtle">
        Senha
        <input name="password" type="password" autoComplete="current-password" required className="h-12 rounded-lg border border-hairline bg-background px-3 text-sm text-white outline-none focus:border-accent" />
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button disabled={pending} className="min-h-12 w-full rounded-lg bg-accent px-4 text-sm font-black uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-xs text-faint">Acesso restrito a administradores e moderadores.</p>
    </form>
  );
}
