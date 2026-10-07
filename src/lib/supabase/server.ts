import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function hasSupabasePublicConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseServerConfig(): boolean {
  return hasSupabasePublicConfig() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Configure as credenciais públicas do Supabase no ambiente.");
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Configure as credenciais públicas do Supabase no ambiente.");

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; Route Handlers podem.
        }
      },
    },
  });
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.");

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type StaffRole = "admin" | "moderator";

export type StaffContext = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
};

export async function getStaffContext(): Promise<StaffContext | null> {
  if (!hasSupabasePublicConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .single();
  if (error || !profile || (profile.role !== "admin" && profile.role !== "moderator")) return null;

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
  };
}
