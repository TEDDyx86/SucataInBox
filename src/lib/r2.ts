import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

export type R2Object = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Configure R2_BUCKET_NAME no ambiente do servidor.");
  return bucket;
}

export function hasR2Config(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID
      && process.env.R2_ACCESS_KEY_ID
      && process.env.R2_SECRET_ACCESS_KEY
      && process.env.R2_BUCKET_NAME,
  );
}

function getR2Client(): S3Client {
  if (client) return client;
  const { R2_ACCOUNT_ID: accountId, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Configure as credenciais S3 do Cloudflare R2 no ambiente do servidor.");
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export async function putR2Object(object: R2Object, signal?: AbortSignal): Promise<void> {
  await getR2Client().send(new PutObjectCommand({
    Bucket: getBucketName(),
    Key: object.key,
    Body: object.body,
    ContentType: object.contentType,
  }), signal ? { abortSignal: signal } : undefined);
}

export async function getR2Object(key: string): Promise<Uint8Array> {
  const result = await getR2Client().send(new GetObjectCommand({ Bucket: getBucketName(), Key: key }));
  if (!result.Body) throw new Error("Objeto não encontrado no R2.");
  return result.Body.transformToByteArray();
}

export async function getR2SignedUrl(key: string, expiresIn = 90): Promise<string> {
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: getBucketName(), Key: key }),
    { expiresIn },
  );
}

export async function deleteR2Objects(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const result = await getR2Client().send(new DeleteObjectsCommand({
    Bucket: getBucketName(),
    Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
  }));
  if (result.Errors?.length) throw new Error("Alguns objetos não puderam ser removidos do R2.");
}

export async function listR2Keys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const result = await getR2Client().send(new ListObjectsV2Command({
      Bucket: getBucketName(),
      Prefix: `${prefix.replace(/\/+$/, "")}/`,
      ContinuationToken: continuationToken,
    }));
    for (const object of result.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    continuationToken = result.NextContinuationToken;
  } while (continuationToken);
  return keys;
}
