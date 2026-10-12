export type CommunityClipOwnership = {
  id: string;
  status: string;
  community_submission_id: string | null;
};

export function resolveClipImportOwnership(
  existing: CommunityClipOwnership | null,
  communitySubmissionId: string | null,
): "create" | "retry" {
  if (!existing) return "create";
  if (existing.community_submission_id && existing.community_submission_id !== communitySubmissionId) {
    throw new Error("Este clipe pertence à fila de submissões comunitárias.");
  }
  if (communitySubmissionId && existing.community_submission_id !== communitySubmissionId) {
    throw new Error("Este clipe já está importado ou em processamento.");
  }
  if (existing.status === "processing" && communitySubmissionId && existing.community_submission_id === communitySubmissionId) {
    return "retry";
  }
  if (existing.status !== "failed") {
    throw new Error("Este clipe já está importado ou em processamento.");
  }
  return "retry";
}

export async function publishImportedClip(
  clipId: string,
  communitySubmissionId: string | null,
  publishStaffImport: () => Promise<void>,
  finalizeCommunityImport: (submissionId: string, clipId: string) => Promise<void>,
): Promise<void> {
  if (communitySubmissionId) {
    await finalizeCommunityImport(communitySubmissionId, clipId);
    return;
  }
  await publishStaffImport();
}
