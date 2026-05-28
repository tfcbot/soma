import type { FileSystemPort } from "./operations";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Object storage + public delivery, on Cloudflare R2 via the S3 API (durable blobs + a CDN URL for
// anything written public). Any S3-compatible store works — swap the endpoint/credentials.
export interface R2Options {
  r2AccountId: string; r2AccessKeyId: string;
  r2SecretAccessKey: string; bucket: string; cdnBaseUrl: string;
}
const key = (p: string) => p.replace(/^\//, "");

export class R2FileSystem implements FileSystemPort {
  private readonly s3: S3Client;
  constructor(private readonly opts: R2Options) {
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${opts.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: opts.r2AccessKeyId, secretAccessKey: opts.r2SecretAccessKey },
    });
  }
  async read(input: { path: string }) {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.opts.bucket, Key: key(input.path) }));
      if (!res.Body) return { data: null };
      const bytes = await (res.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
      return { data: Buffer.from(bytes).toString("base64") };
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return { data: null };
      throw err;
    }
  }
  async write(input: { path: string; data: string; public?: boolean }) {
    await this.s3.send(new PutObjectCommand({ Bucket: this.opts.bucket, Key: key(input.path), Body: Buffer.from(input.data, "base64") }));
    return { path: input.path, url: input.public ? this.urlFor(input.path) : undefined };
  }
  async list(input: { prefix?: string }) {
    const res = await this.s3.send(new ListObjectsV2Command({ Bucket: this.opts.bucket, Prefix: key(input.prefix ?? "") }));
    return { paths: (res.Contents ?? []).map((o) => o.Key ?? "").filter((k) => k.length > 0) };
  }
  async publicUrl(input: { path: string }) { return { url: this.urlFor(input.path) }; }
  private urlFor(path: string): string { return `${this.opts.cdnBaseUrl.replace(/\/$/, "")}/${key(path)}`; }
}
