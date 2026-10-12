import "server-only";
import { importKickClip } from "./clip-import";
import { importTwitchClip } from "./twitch-clip-import";
import { deleteR2Objects, listR2Keys } from "./r2";
import { createSupabaseAdminClient, type StaffContext } from "./supabase/server";
import {
  approveClipSubmission,
  rejectClipSubmission,
  retryClipSubmission,
  type ClipSubmissionModerationDependencies,
  type ModerationResult,
  type ModerationSubmission,
} from "./clip-submission-moderation";

const SUBMISSION_COLUMNS = "id, source_platform, source_clip_id, source_url, display_name, status, failure_reason, cleanup_error, created_at, processing_started_at";

export async function getClipSubmissionQueue(): Promise<ModerationSubmission[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clip_submissions")
    .select(SUBMISSION_COLUMNS)
    .in("status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar a fila de clipes.");
  return (data ?? []) as ModerationSubmission[];
}

export async function moderateClipSubmission(
  id: string,
  action: "approve" | "retry" | "reject",
  staff: StaffContext,
): Promise<ModerationResult> {
  const supabase = createSupabaseAdminClient();
  const repository: ClipSubmissionModerationDependencies["repository"] = {
    get: async (submissionId) => {
      const { data, error } = await supabase.from("clip_submissions").select(SUBMISSION_COLUMNS).eq("id", submissionId).maybeSingle();
      if (error) throw new Error("Não foi possível localizar a submissão.");
      return data as ModerationSubmission | null;
    },
    claimPending: async (submissionId, now) => {
      const { data, error } = await supabase.from("clip_submissions")
        .update({ status: "processing", processing_started_at: now, failure_reason: null, cleanup_error: false, updated_at: now })
        .eq("id", submissionId).eq("status", "pending")
        .select(SUBMISSION_COLUMNS).maybeSingle();
      if (error) throw new Error("Não foi possível iniciar a aprovação.");
      return data as ModerationSubmission | null;
    },
    claimRetryable: async (submissionId, now, staleBefore) => {
      const failed = await supabase.from("clip_submissions")
        .update({ status: "processing", processing_started_at: now, failure_reason: null, updated_at: now })
        .eq("id", submissionId).eq("status", "failed").eq("cleanup_error", false)
        .select(SUBMISSION_COLUMNS).maybeSingle();
      if (failed.error) throw new Error("Não foi possível reiniciar o processamento.");
      if (failed.data) return failed.data as ModerationSubmission;

      const stale = await supabase.from("clip_submissions")
        .update({ status: "processing", processing_started_at: now, failure_reason: null, updated_at: now })
        .eq("id", submissionId).eq("status", "processing").lt("processing_started_at", staleBefore)
        .select(SUBMISSION_COLUMNS).maybeSingle();
      if (stale.error) throw new Error("Não foi possível recuperar o processamento.");
      return stale.data as ModerationSubmission | null;
    },
    claimForDeletion: async (submissionId, now, staleBefore) => {
      const idle = await supabase.from("clip_submissions")
        .update({ status: "processing", processing_started_at: now, failure_reason: null, cleanup_error: false, updated_at: now })
        .eq("id", submissionId).in("status", ["pending", "failed"])
        .select(SUBMISSION_COLUMNS).maybeSingle();
      if (idle.error) throw new Error("Não foi possível iniciar a exclusão.");
      if (idle.data) return idle.data as ModerationSubmission;

      const stale = await supabase.from("clip_submissions")
        .update({ status: "processing", processing_started_at: now, failure_reason: null, cleanup_error: false, updated_at: now })
        .eq("id", submissionId).eq("status", "processing").lt("processing_started_at", staleBefore)
        .select(SUBMISSION_COLUMNS).maybeSingle();
      if (stale.error) throw new Error("Não foi possível recuperar a exclusão.");
      return stale.data as ModerationSubmission | null;
    },
    markImportFailed: async (submissionId, processingStartedAt, reason) => {
      const { data, error } = await supabase.from("clip_submissions")
        .update({ status: "failed", failure_reason: reason, updated_at: new Date().toISOString() })
        .eq("id", submissionId).eq("status", "processing").eq("processing_started_at", processingStartedAt)
        .select("id").maybeSingle();
      return !error && data !== null;
    },
    findOwnedClip: async (submissionId) => {
      const { data, error } = await supabase.from("clips")
        .select("id, community_submission_id, storage_prefix, status")
        .eq("community_submission_id", submissionId).maybeSingle();
      if (error) throw new Error("Não foi possível localizar a mídia da submissão.");
      return data;
    },
    hideOwnedClip: async (submissionId) => {
      const { error } = await supabase.from("clips")
        .update({ status: "failed", failure_reason: "A submissão está sendo removida." })
        .eq("community_submission_id", submissionId);
      if (error) throw new Error("Não foi possível ocultar o clipe antes da exclusão.");
    },
    deleteMediaPrefix: async (prefix) => deleteR2Objects(await listR2Keys(prefix)),
    deleteOwnedClip: async (submissionId) => {
      const { error } = await supabase.from("clips").delete().eq("community_submission_id", submissionId);
      if (error) throw new Error("Não foi possível remover o registro do clipe.");
    },
    deleteSubmission: async (submissionId, processingStartedAt) => {
      const { data, error } = await supabase.from("clip_submissions").delete()
        .eq("id", submissionId).eq("status", "processing").eq("processing_started_at", processingStartedAt)
        .select("id").maybeSingle();
      return !error && data !== null;
    },
    markCleanupFailed: async (submissionId, processingStartedAt, reason) => {
      await supabase.from("clip_submissions")
        .update({ status: "failed", failure_reason: reason, cleanup_error: true, updated_at: new Date().toISOString() })
        .eq("id", submissionId).eq("status", "processing").eq("processing_started_at", processingStartedAt);
    },
  };

  const dependencies: ClipSubmissionModerationDependencies = {
    now: () => new Date(),
    repository,
    importClip: async (submission, context) => {
      if (submission.source_platform === "kick") {
        await importKickClip(submission.source_url, staff, context);
      } else {
        await importTwitchClip(submission.source_url, staff, context);
      }
    },
  };

  if (action === "approve") return approveClipSubmission(id, staff, dependencies);
  if (action === "retry") return retryClipSubmission(id, staff, dependencies);
  return rejectClipSubmission(id, staff, dependencies);
}
