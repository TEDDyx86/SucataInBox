import { ClipAdminList, type ManagedClip } from "@/components/ClipAdminList";
import { ClipImportForm } from "@/components/ClipImportForm";
import { ClipSubmissionReview } from "@/components/ClipSubmissionReview";
import { TEAM } from "@/data/team";
import { getClipOwnerDisplay } from "@/lib/clip-owner-display";
import { getClipSubmissionQueue } from "@/lib/clip-submission-moderation-server";
import { createSupabaseAdminClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminClipsPage() {
  if (!hasSupabaseServerConfig()) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-amber-100">Configure Supabase no ambiente para usar o painel.</main>;
  }
  const supabase = createSupabaseAdminClient();
  const [{ data, error }, submissions] = await Promise.all([
    supabase
      .from("clips")
      .select("id, title, source_platform, source_url, player_id, coach_staff_id, status, failure_reason, created_at")
      .is("community_submission_id", null)
      .order("created_at", { ascending: false })
      .limit(100),
    getClipSubmissionQueue(),
  ]);
  if (error) throw new Error("Não foi possível carregar os clipes do painel.");
  const players = TEAM.map(({ id, name }) => ({ id, name }));
  const clips = (data ?? []).map((clip) => ({
    ...clip,
    player_name: getClipOwnerDisplay(clip.player_id, clip.coach_staff_id).name,
    owner_tag: getClipOwnerDisplay(clip.player_id, clip.coach_staff_id).tag,
  })) as ManagedClip[];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Administração</p>
        <h1 className="mt-2 text-3xl font-black text-white">Clipes</h1>
      </header>
      <ClipSubmissionReview submissions={submissions} now={new Date().toISOString()} />
      <ClipImportForm />

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Importações recentes</h2>
          <span className="text-xs text-faint">{clips.length} itens</span>
        </div>
        <ClipAdminList clips={clips} players={players} />
      </section>
    </main>
  );
}
