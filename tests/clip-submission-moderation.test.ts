import { describe, expect, it } from "vitest";
import {
  approveClipSubmission,
  rejectClipSubmission,
  retryClipSubmission,
  type ClipSubmissionModerationDependencies,
  type ModerationSubmission,
} from "../src/lib/clip-submission-moderation";

const staff = { role: "moderator" as const };
const pending: ModerationSubmission = {
  id: "submission-1",
  source_platform: "kick",
  source_clip_id: "clip_12345",
  source_url: "https://kick.com/player/clips/clip_12345",
  display_name: null,
  status: "pending",
  failure_reason: null,
  cleanup_error: false,
  created_at: "2026-10-12T12:00:00.000Z",
  processing_started_at: null,
};

function harness(initial: ModerationSubmission = pending, options: { importError?: boolean; cleanupError?: boolean } = {}) {
  let row: ModerationSubmission | null = { ...initial };
  let clip: { id: string; community_submission_id: string; storage_prefix: string | null; status: string } | null = null;
  const calls: string[] = [];
  const dependencies: ClipSubmissionModerationDependencies = {
    now: () => new Date("2026-10-12T12:10:00.000Z"),
    repository: {
      get: async () => row,
      claimPending: async (_id, now) => {
        if (!row || row.status !== "pending") return null;
        row = { ...row, status: "processing", processing_started_at: now };
        return row;
      },
      claimRetryable: async (_id, now, staleBefore) => {
        if (!row || row.cleanup_error) return null;
        const stale = row.status === "processing" && row.processing_started_at !== null && row.processing_started_at < staleBefore;
        if (row.status !== "failed" && !stale) return null;
        row = { ...row, status: "processing", processing_started_at: now, failure_reason: null };
        return row;
      },
      claimForDeletion: async (_id, now, staleBefore) => {
        if (!row) return null;
        const deletable = row.status === "pending" || row.status === "failed" ||
          (row.status === "processing" && row.processing_started_at !== null && row.processing_started_at < staleBefore);
        if (!deletable) return null;
        row = { ...row, status: "processing", processing_started_at: now };
        return row;
      },
      markImportFailed: async (_id, processingStartedAt, reason) => {
        if (!row || row.processing_started_at !== processingStartedAt) return false;
        row = { ...row, status: "failed", failure_reason: reason };
        return true;
      },
      findOwnedClip: async (submissionId) => clip?.community_submission_id === submissionId ? clip : null,
      hideOwnedClip: async (submissionId) => {
        if (!clip || clip.community_submission_id !== submissionId) return;
        clip = { ...clip, status: "failed" };
      },
      deleteMediaPrefix: async (prefix) => {
        calls.push(`delete-media:${prefix}`);
        if (options.cleanupError) throw new Error("R2 secret detail");
      },
      deleteOwnedClip: async (submissionId) => {
        if (clip?.community_submission_id === submissionId) clip = null;
      },
      deleteSubmission: async (id, processingStartedAt) => {
        if (row?.id !== id || row.processing_started_at !== processingStartedAt) return false;
        row = null;
        return true;
      },
      markCleanupFailed: async (_id, processingStartedAt) => {
        if (row?.processing_started_at !== processingStartedAt) return;
        row = { ...row, status: "failed", cleanup_error: true, failure_reason: "Não foi possível concluir a exclusão. Tente novamente." };
      },
    },
    importClip: async (submission, context) => {
      calls.push(`import:${submission.source_platform}:${context.processingStartedAt}`);
      if (options.importError) throw new Error("provider key leaked");
      // Model the importer's atomic finalizer deleting the transient submission.
      if (row?.id === submission.id && row.processing_started_at === context.processingStartedAt) row = null;
    },
  };
  return {
    dependencies,
    calls,
    setClip(value: typeof clip) { clip = value; },
    getSubmission: () => row,
    getClip: () => clip,
  };
}

describe("clip submission moderation", () => {
  it("lets a moderator approve once and treats the finalizer as publication", async () => {
    const h = harness();
    await expect(approveClipSubmission("submission-1", staff, h.dependencies)).resolves.toEqual({ kind: "published" });
    await expect(approveClipSubmission("submission-1", staff, h.dependencies)).resolves.toEqual({ kind: "not-found" });
    expect(h.calls).toHaveLength(1);
    expect(h.getSubmission()).toBeNull();
  });

  it("prevents two concurrent approvals from invoking the importer twice", async () => {
    const h = harness();
    const originalImport = h.dependencies.importClip;
    let announceStarted!: () => void;
    let releaseImport!: () => void;
    const started = new Promise<void>((resolve) => { announceStarted = resolve; });
    const gate = new Promise<void>((resolve) => { releaseImport = resolve; });
    h.dependencies.importClip = async (...args) => {
      announceStarted();
      await gate;
      await originalImport(...args);
    };

    const first = approveClipSubmission("submission-1", staff, h.dependencies);
    await started;
    await expect(approveClipSubmission("submission-1", staff, h.dependencies)).resolves.toEqual({ kind: "conflict" });
    releaseImport();
    await expect(first).resolves.toEqual({ kind: "published" });
    expect(h.calls).toHaveLength(1);
  });

  it("keeps an import failure retryable and sanitizes provider details", async () => {
    const h = harness(pending, { importError: true });
    await expect(approveClipSubmission("submission-1", staff, h.dependencies)).resolves.toEqual({ kind: "failed" });
    expect(h.getSubmission()).toMatchObject({ status: "failed", cleanup_error: false });
    expect(h.getSubmission()?.failure_reason).not.toContain("provider key");
  });

  it("rejects a fresh processing claim but recovers a stale one", async () => {
    const active = harness({ ...pending, status: "processing", processing_started_at: "2026-10-12T12:09:00.000Z" });
    await expect(retryClipSubmission("submission-1", staff, active.dependencies)).resolves.toEqual({ kind: "conflict" });

    const stale = harness({ ...pending, status: "processing", processing_started_at: "2026-10-12T12:00:00.000Z" });
    await expect(retryClipSubmission("submission-1", staff, stale.dependencies)).resolves.toEqual({ kind: "published" });
  });

  it("deletes a failed community Kick clip and its media before deleting the submission", async () => {
    const h = harness({ ...pending, status: "failed" });
    h.setClip({ id: "clip-row", community_submission_id: pending.id, storage_prefix: "clips/clip-row", status: "failed" });
    await expect(rejectClipSubmission("submission-1", staff, h.dependencies)).resolves.toEqual({ kind: "deleted" });
    expect(h.calls).toEqual(["delete-media:clips/clip-row"]);
    expect(h.getClip()).toBeNull();
    expect(h.getSubmission()).toBeNull();
  });

  it("leaves the submission retryable and sanitizes errors when media cleanup fails", async () => {
    const h = harness({ ...pending, status: "failed" }, { cleanupError: true });
    h.setClip({ id: "clip-row", community_submission_id: pending.id, storage_prefix: "clips/clip-row", status: "failed" });
    await expect(rejectClipSubmission("submission-1", staff, h.dependencies)).resolves.toEqual({ kind: "cleanup-failed" });
    expect(h.getSubmission()).toMatchObject({ status: "failed", cleanup_error: true });
    expect(h.getClip()?.status).toBe("failed");
  });

  it("deletes a pending submission without touching a same-source staff clip", async () => {
    const h = harness();
    h.setClip({ id: "staff-clip", community_submission_id: "other-submission", storage_prefix: "clips/staff-clip", status: "published" });
    await expect(rejectClipSubmission("submission-1", staff, h.dependencies)).resolves.toEqual({ kind: "deleted" });
    expect(h.getClip()?.id).toBe("staff-clip");
    expect(h.calls).toEqual([]);
  });

  it("requires staff authorization before claiming work", async () => {
    const h = harness();
    await expect(approveClipSubmission("submission-1", null, h.dependencies)).resolves.toEqual({ kind: "unauthorized" });
    expect(h.calls).toEqual([]);
  });
});
