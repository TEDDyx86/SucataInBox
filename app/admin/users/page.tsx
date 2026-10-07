import { notFound } from "next/navigation";
import { UserManager, type ManagedUser } from "@/components/UserManager";
import { createSupabaseAdminClient, getStaffContext, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const staff = await getStaffContext();
  if (!staff || staff.role !== "admin") notFound();
  if (!hasSupabaseServerConfig()) notFound();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar as contas de staff.");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Somente admin</p>
        <h1 className="mt-2 text-3xl font-black text-white">Usuários</h1>
      </header>
      <UserManager users={(data ?? []) as ManagedUser[]} currentUserId={staff.id} />
    </main>
  );
}
