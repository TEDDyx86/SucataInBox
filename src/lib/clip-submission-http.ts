import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { parseClipSubmission, type ClipSubmissionInput } from "./clip-submission-input";
import type { CreateClipSubmissionResult } from "./clip-submissions";

const MAX_REQUEST_BYTES = 4096;
const RECEIPT = { received: true };

export type ClipSubmissionHttpDependencies = {
  secret?: string;
  submit: (value: ClipSubmissionInput, ipHash: string) => Promise<CreateClipSubmissionResult>;
};

export async function handleClipSubmissionPost(
  request: Request,
  dependencies: ClipSubmissionHttpDependencies,
): Promise<Response> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Envie uma requisição JSON válida." }, 400);
  }

  let rawBody: string;
  try {
    const body = await readBoundedBody(request);
    if (body.kind === "too-large") return json({ error: "Requisição muito grande." }, 413);
    rawBody = body.text;
  } catch {
    return json({ error: "Envie um JSON válido." }, 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Envie um JSON válido." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Envie um JSON válido." }, 400);
  }
  const record = body as Record<string, unknown>;

  if (record.website) return json(RECEIPT, 201);
  const parsed = parseClipSubmission(body);
  if (!parsed.ok) return json({ error: parsed.error }, 422);

  const forwardedFor = request.headers.get("x-forwarded-for");
  const rawIp = forwardedFor?.split(",").at(-1)?.trim();
  if (!dependencies.secret || !rawIp || isIP(rawIp) === 0) {
    return json({ error: "Não foi possível receber o envio agora. Tente novamente mais tarde." }, 503);
  }

  const ipHash = createHmac("sha256", dependencies.secret).update(rawIp).digest("hex");
  const result = await dependencies.submit(parsed.value, ipHash);
  switch (result.kind) {
    case "created":
      return json(RECEIPT, 201);
    case "duplicate":
      return json({ error: "Este clipe já foi enviado ou publicado." }, 409);
    case "rate-limited":
      return json({ error: "Limite de envios atingido. Tente novamente mais tarde." }, 429);
    case "invalid":
      return json({ error: "O envio não pôde ser validado." }, 422);
    default:
      return json({ error: "Não foi possível receber o envio agora. Tente novamente mais tarde." }, 503);
  }
}

function json(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

async function readBoundedBody(request: Request): Promise<{ kind: "body"; text: string } | { kind: "too-large" }> {
  if (!request.body) return { kind: "body", text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return { kind: "too-large" };
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { kind: "body", text: new TextDecoder().decode(body) };
}
