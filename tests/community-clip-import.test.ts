import { describe, expect, it, vi } from "vitest";
import { resolveClipImportOwnership, publishImportedClip } from "../src/lib/community-clip-import";

describe("community clip import ownership", () => {
  it("creates a new community-owned clip", () => {
    expect(resolveClipImportOwnership(null, "submission-1")).toBe("create");
  });

  it("retries only a failed clip owned by the same submission", () => {
    expect(resolveClipImportOwnership({ id: "clip-1", status: "failed", community_submission_id: "submission-1" }, "submission-1"))
      .toBe("retry");
    expect(() => resolveClipImportOwnership({ id: "clip-1", status: "failed", community_submission_id: null }, "submission-1"))
      .toThrow(/já está importado/i);
    expect(() => resolveClipImportOwnership({ id: "clip-1", status: "published", community_submission_id: null }, "submission-1"))
      .toThrow(/já está importado/i);
  });

  it("does not let direct staff import adopt a community-owned failure", () => {
    expect(() => resolveClipImportOwnership({ id: "clip-1", status: "failed", community_submission_id: "submission-1" }, null))
      .toThrow(/fila de submissões/i);
  });

  it("preserves direct staff retry for a failed staff-owned clip", () => {
    expect(resolveClipImportOwnership({ id: "clip-1", status: "failed", community_submission_id: null }, null))
      .toBe("retry");
  });

  it("uses the community finalizer only when a submission owns the clip", async () => {
    const calls: string[] = [];
    await publishImportedClip("clip-1", "submission-1", async () => { calls.push("legacy"); }, async (submissionId, clipId) => {
      calls.push(`finalize:${submissionId}:${clipId}`);
    });
    expect(calls).toEqual(["finalize:submission-1:clip-1"]);

    await publishImportedClip("clip-2", null, async () => { calls.push("legacy"); }, async () => { calls.push("unexpected"); });
    expect(calls.at(-1)).toBe("legacy");
  });

  it("does not fall back to direct publication when community finalization fails", async () => {
    const legacyPublish = vi.fn();
    await expect(publishImportedClip("clip-1", "submission-1", legacyPublish, async () => {
      throw new Error("finalize failed");
    })).rejects.toThrow("finalize failed");
    expect(legacyPublish).not.toHaveBeenCalled();
  });
});
