import { describe, expect, it, vi } from "vitest";
import { createClipSubmission } from "../src/lib/clip-submissions";
import { handleClipSubmissionPost } from "../src/lib/clip-submission-http";
import { parseClipSubmission } from "../src/lib/clip-submission-input";

const sourceUrl = "https://clips.twitch.tv/FunPoisedGiraffeGingerPower-KDy2fwLNuUEHU";
const validBody = { sourceUrl, displayName: "", consent: false, website: "" };
const parsedValue = parseClipSubmission(validBody);
if (!parsedValue.ok) throw new Error("test fixture must be valid");

describe("createClipSubmission", () => {
  it.each([
    [{ kind: "created", id: "private-id" }, { kind: "created" }],
    [{ kind: "duplicate" }, { kind: "duplicate" }],
    [{ kind: "rate_limited" }, { kind: "rate-limited" }],
    [{ kind: "invalid" }, { kind: "invalid" }],
  ])("maps RPC result %j", async (rpcResult, expected) => {
    const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null });
    await expect(createClipSubmission(parsedValue.value, "a".repeat(64), rpc)).resolves.toEqual(expected);
    expect(rpc).toHaveBeenCalledWith("submit_community_clip", expect.any(Object));
  });

  it("does not expose database errors", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "secret database detail" } });
    await expect(createClipSubmission(parsedValue.value, "a".repeat(64), rpc)).resolves.toEqual({ kind: "unavailable" });
  });
});

describe("public submission endpoint contract", () => {
  function post(body: unknown, overrides: Partial<Parameters<typeof handleClipSubmissionPost>[1]> = {}) {
    return handleClipSubmissionPost(
      new Request("https://example.test/api/clip-submissions", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.11, 203.0.113.2" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      {
        secret: "service-secret",
        submit: vi.fn().mockResolvedValue({ kind: "created" }),
        ...overrides,
      },
    );
  }

  it("returns a generic receipt on success without exposing a submission id", async () => {
    const submit = vi.fn().mockResolvedValue({ kind: "created", id: "private-id" });
    const response = await post(validBody, { submit });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ received: true });
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ sourcePlatform: "twitch" }), expect.any(String));
  });

  it("silently accepts the honeypot without a persistence call", async () => {
    const submit = vi.fn();
    const response = await post({ ...validBody, website: "filled" }, { submit });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ received: true });
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    ["{bad json", 400],
    [JSON.stringify({ sourceUrl: "https://evil.example/x" }), 422],
  ])("rejects invalid payload with status %i", async (body, expectedStatus) => {
    const response = await post(body);
    expect(response.status).toBe(expectedStatus);
  });

  it.each([
    [{ kind: "duplicate" }, 409],
    [{ kind: "rate-limited" }, 429],
    [{ kind: "unavailable" }, 503],
    [{ kind: "invalid" }, 422],
  ])("maps persistence result %j to status %i", async (result, status) => {
    const response = await post(validBody, { submit: vi.fn().mockResolvedValue(result) });
    expect(response.status).toBe(status);
    expect((await response.text()).includes("private-id")).toBe(false);
  });

  it("fails closed when platform IP metadata or server secret is missing", async () => {
    const noIpRequest = new Request("https://example.test/api/clip-submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const submit = vi.fn();
    expect((await handleClipSubmissionPost(noIpRequest, { secret: "secret", submit })).status).toBe(503);
    expect((await post(validBody, { secret: undefined })).status).toBe(503);
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects oversized requests before parsing", async () => {
    const request = new Request("https://example.test/api/clip-submissions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.2" },
      body: `{"sourceUrl":"${"a".repeat(5000)}"}`,
    });
    const submit = vi.fn();
    expect((await handleClipSubmissionPost(request, { secret: "secret", submit })).status).toBe(413);
    expect(submit).not.toHaveBeenCalled();
  });
});
