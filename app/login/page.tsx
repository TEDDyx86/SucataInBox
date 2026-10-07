import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { hasSupabasePublicConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const query = await searchParams;
  const nextPath = query.next?.startsWith("/") && !query.next.startsWith("//") ? query.next : "/admin/clips";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-7 sm:p-9">
        <Link href="/" className="text-xs font-black uppercase tracking-[0.2em] text-accent">Sucata in Box</Link>
        <h1 className="mt-4 text-2xl font-black text-white">Área da equipe</h1>
        <p className="mt-2 mb-7 text-sm text-subtle">Entre para gerenciar os clipes.</p>
        {hasSupabasePublicConfig() ? (
          <LoginForm nextPath={nextPath} />
        ) : (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
            Configure as variáveis do Supabase no ambiente para ativar o login.
          </p>
        )}
      </section>
    </main>
  );
}
