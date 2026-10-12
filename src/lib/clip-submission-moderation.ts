import type { CommunityClipImportContext } from "./clip-import";

export type ModerationSubmission = {
  id: string;
  source_platform: "kick" | "twitch";
  source_clip_id: string;
  source_url: string;
  display_name: string | null;
  status: "pending" | "processing" | "failed";
  failure_reason: string | null;
  cleanup_error: boolean;
  created_at: string;
  processing_started_at: string | null;
};

export type ModerationStaff = { role: "admin" | "moderator" };
export type ModerationResult = { kind: "published" | "failed" | "conflict" | "not-found" | "unauthorized" | "deleted" | "cleanup-failed" };

export type ClipSubmissionModerationDependencies = {
  now: () => Date;
  repository: {
    get(id: string): Promise<ModerationSubmission | null>;
    claimPending(id: string, now: string): Promise<ModerationSubmission | null>;
    claimRetryable(id: string, now: string, staleBefore: string): Promise<ModerationSubmission | null>;
    claimForDeletion(id: string, now: string, staleBefore: string): Promise<ModerationSubmission | null>;
    markImportFailed(id: string, processingStartedAt: string, reason: string): Promise<boolean>;
    findOwnedClip(submissionId: string): Promise<{ id: string; community_submission_id: string; storage_prefix: string | null; status: string } | null>;
    hideOwnedClip(submissionId: string): Promise<void>;
    deleteMediaPrefix(prefix: string): Promise<void>;
    deleteOwnedClip(submissionId: string): Promise<void>;
    deleteSubmission(id: string, processingStartedAt: string): Promise<boolean>;
    markCleanupFailed(id: string, processingStartedAt: string, reason: string): Promise<void>;
  };
  importClip: (submission: ModerationSubmission, context: CommunityClipImportContext) => Promise<void>;
};

const RECOVERY_WINDOW_MS = 2 * 60 * 1000;
const IMPORT_FAILURE_MESSAGE = "O processamento falhou. Você pode tentar novamente ou excluir a submissão.";
const CLEANUP_FAILURE_MESSAGE = "Não foi possível concluir a exclusão. A mídia permanece oculta; tente novamente.";

export async function approveClipSubmission(
  id: string,
  staff: ModerationStaff | null,
  dependencies: ClipSubmissionModerationDependencies,
): Promise<ModerationResult> {
  if (!isStaff(staff)) return { kind: "unauthorized" };
  const row = await dependencies.repository.get(id);
  if (!row) return { kind: "not-found" };
  const now = dependencies.now();
  const claimed = await dependencies.repository.claimPending(id, now.toISOString());
  if (!claimed) return { kind: "conflict" };
  return runImport(claimed, dependencies);
}

export async function retryClipSubmission(
  id: string,
  staff: ModerationStaff | null,
  dependencies: ClipSubmissionModerationDependencies,
): Promise<ModerationResult> {
  if (!isStaff(staff)) return { kind: "unauthorized" };
  const row = await dependencies.repository.get(id);
  if (!row) return { kind: "not-found" };
  const now = dependencies.now();
  const claimed = await dependencies.repository.claimRetryable(
    id,
    now.toISOString(),
    new Date(now.getTime() - RECOVERY_WINDOW_MS).toISOString(),
  );
  if (!claimed) return { kind: "conflict" };
  return runImport(claimed, dependencies);
}

export async function rejectClipSubmission(
  id: string,
  staff: ModerationStaff | null,
  dependencies: ClipSubmissionModerationDependencies,
): Promise<ModerationResult> {
  if (!isStaff(staff)) return { kind: "unauthorized" };
  const row = await dependencies.repository.get(id);
  if (!row) return { kind: "not-found" };
  const now = dependencies.now();
  const claimed = await dependencies.repository.claimForDeletion(
    id,
    now.toISOString(),
    new Date(now.getTime() - RECOVERY_WINDOW_MS).toISOString(),
  );
  if (!claimed) return { kind: "conflict" };
  const processingStartedAt = claimed.processing_started_at;
  if (!processingStartedAt) return { kind: "conflict" };

  try {
    const clip = await dependencies.repository.findOwnedClip(claimed.id);
    if (clip) {
      await dependencies.repository.hideOwnedClip(claimed.id);
      if (clip.storage_prefix) await dependencies.repository.deleteMediaPrefix(clip.storage_prefix);
      await dependencies.repository.deleteOwnedClip(claimed.id);
    }
    const deleted = await dependencies.repository.deleteSubmission(claimed.id, processingStartedAt);
    return deleted ? { kind: "deleted" } : { kind: "conflict" };
  } catch {
    try {
      await dependencies.repository.markCleanupFailed(claimed.id, processingStartedAt, CLEANUP_FAILURE_MESSAGE);
    } catch {
      // Keep the submission processing/hidden if even the cleanup failure cannot be recorded.
    }
    return { kind: "cleanup-failed" };
  }
}

async function runImport(
  submission: ModerationSubmission,
  dependencies: ClipSubmissionModerationDependencies,
): Promise<ModerationResult> {
  const processingStartedAt = submission.processing_started_at;
  if (!processingStartedAt) return { kind: "conflict" };
  try {
    await dependencies.importClip(submission, {
      submissionId: submission.id,
      processingStartedAt,
    });
    return await dependencies.repository.get(submission.id)
      ? failImport(submission.id, processingStartedAt, dependencies)
      : { kind: "published" };
  } catch {
    return failImport(submission.id, processingStartedAt, dependencies);
  }
}

async function failImport(
  id: string,
  processingStartedAt: string,
  dependencies: ClipSubmissionModerationDependencies,
): Promise<ModerationResult> {
  await dependencies.repository.markImportFailed(id, processingStartedAt, IMPORT_FAILURE_MESSAGE);
  return { kind: "failed" };
}

function isStaff(staff: ModerationStaff | null): staff is ModerationStaff {
  return staff?.role === "admin" || staff?.role === "moderator";
}
