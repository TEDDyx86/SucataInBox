import type { ClipSubmissionInput } from "./clip-submission-input";

type RpcResult = { data: unknown; error: unknown };
export type SubmissionRpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

export type CreateClipSubmissionResult =
  | { kind: "created"; id?: string }
  | { kind: "duplicate" | "rate-limited" | "invalid" | "unavailable" };

export async function createClipSubmission(
  value: ClipSubmissionInput,
  ipHash: string,
  rpc: SubmissionRpc,
): Promise<CreateClipSubmissionResult> {
  try {
    const { data, error } = await rpc("submit_community_clip", {
      p_platform: value.sourcePlatform,
      p_clip_id: value.sourceClipId,
      p_source_url: value.sourceUrl,
      p_display_name: value.displayName,
      p_consent: value.displayNameConsentAt !== null,
      p_ip_hash: ipHash,
    });
    if (error || !data || typeof data !== "object") return { kind: "unavailable" };

    const result = data as { kind?: unknown; id?: unknown };
    if (result.kind === "created") return { kind: "created" };
    if (result.kind === "duplicate") return { kind: "duplicate" };
    if (result.kind === "rate_limited") return { kind: "rate-limited" };
    if (result.kind === "invalid") return { kind: "invalid" };
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}
