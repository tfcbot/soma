import type { FileSystemPort, Input, Output } from "../../packages/contract/src/index";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Real adapter — Archil disk backed by an R2 bucket. Binary crosses the contract as base64;
// this adapter bridges base64 ⇄ stored bytes. publicUrl is CDN_BASE/key.
export interface ArchilOptions {
  diskId: string;
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  bucket: string;
  cdnBaseUrl: string;
}
function normalizeKey(path: string): string {
  return path.replace(/^\//, "");
}

export class ArchilFileSystem implements FileSystemPort {
  private readonly s3: S3Client;
  constructor(private readonly opts: ArchilOptions) {
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${opts.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: opts.r2AccessKeyId, secretAccessKey: opts.r2SecretAccessKey },
    });
  }
  async read(input: Input<"fsRead">): Promise<Output<"fsRead">> {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.opts.bucket, Key: normalizeKey(input.path) }),
      );
      if (!res.Body) return { data: null };
      const bytes = await (res.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
      return { data: Buffer.from(bytes).toString("base64") };
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return { data: null };
      throw err;
    }
  }
  async write(input: Input<"fsWrite">): Promise<Output<"fsWrite">> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.opts.bucket,
        Key: normalizeKey(input.path),
        Body: Buffer.from(input.data, "base64"),
      }),
    );
    return { path: input.path, url: input.public ? this.urlFor(input.path) : undefined };
  }
  async list(input: Input<"fsList">): Promise<Output<"fsList">> {
    const res = await this.s3.send(
      new ListObjectsV2Command({ Bucket: this.opts.bucket, Prefix: normalizeKey(input.prefix ?? "") }),
    );
    return { paths: (res.Contents ?? []).map((o) => o.Key ?? "").filter((k) => k.length > 0) };
  }
  async publicUrl(input: Input<"fsPublicUrl">): Promise<Output<"fsPublicUrl">> {
    return { url: this.urlFor(input.path) };
  }
  private urlFor(path: string): string {
    return `${this.opts.cdnBaseUrl.replace(/\/$/, "")}/${normalizeKey(path)}`;
  }
}
