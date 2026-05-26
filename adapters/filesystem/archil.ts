import type { FileSystem, WriteResult } from "../../core/ports/filesystem";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// Real adapter — Archil disk backed by an R2 bucket (SPEC §16). The bucket and the disk are
// the same bytes: an object written here is visible on the Archil filesystem the Sandbox
// mounts, and a public-prefixed object is served by the CDN domain. File IO uses the R2
// S3 API (mirrors VidJutsu convex/actions/storage.ts); publicUrl is CDN_BASE/key.
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

export class ArchilFileSystem implements FileSystem {
  private readonly s3: S3Client;

  constructor(private readonly opts: ArchilOptions) {
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${opts.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: opts.r2AccessKeyId, secretAccessKey: opts.r2SecretAccessKey },
    });
  }

  async read(path: string): Promise<Uint8Array | null> {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.opts.bucket, Key: normalizeKey(path) }),
      );
      if (!res.Body) return null;
      return await (res.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }

  async write(
    path: string,
    data: Uint8Array | string,
    opts?: { public?: boolean },
  ): Promise<WriteResult> {
    const Body = typeof data === "string" ? data : Buffer.from(data);
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.opts.bucket, Key: normalizeKey(path), Body }),
    );
    return { path, url: opts?.public ? this.publicUrl(path) : undefined };
  }

  async list(prefix = ""): Promise<string[]> {
    const res = await this.s3.send(
      new ListObjectsV2Command({ Bucket: this.opts.bucket, Prefix: normalizeKey(prefix) }),
    );
    return (res.Contents ?? []).map((o) => o.Key ?? "").filter((k) => k.length > 0);
  }

  publicUrl(path: string): string {
    return `${this.opts.cdnBaseUrl.replace(/\/$/, "")}/${normalizeKey(path)}`;
  }
}
