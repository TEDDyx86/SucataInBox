import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffContext();
  if (!staff) redirect("/login?next=/admin/clips");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/clips" className="text-xs font-black uppercase tracking-wider text-white">Painel de clipes</Link>
            {staff.role === "admin" && <Link href="/admin/users" className="text-xs font-bold text-subtle hover:text-white">Usuários</Link>}
            <Link href="/clips" className="text-xs font-bold text-subtle hover:text-white">Página pública</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-faint sm:inline">{staff.displayName || staff.email} · {staff.role === "admin" ? "Admin" : "Moderador"}</span>
            <form action="/api/auth/logout" method="post">
              <button className="min-h-10 rounded-lg border border-hairline px-3 text-xs font-bold text-subtle hover:text-white">Sair</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
