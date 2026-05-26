import type { FileSystem, WriteResult } from "../../core/ports/filesystem";

// Real adapter — Archil disk backed by an R2 bucket (SPEC §16). The disk and the bucket are
// the same bytes: write an object to R2 and it appears on the Archil filesystem; the Sandbox
// (mounting the disk) sees it, and a public-prefixed object is served by the CDN domain.
//
// File IO reuses VidJutsu's proven R2 S3Client pattern
// (/Users/blurware/products/vidjutsu-space/vidjutsu/convex/actions/storage.ts):
//   new S3Client({ region:"auto", endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, ... })
//   PutObjectCommand / GetObjectCommand against R2_BUCKET_NAME.
// TODO(SPEC §15): wire @aws-sdk/client-s3 for read/write/list. publicUrl is already real below.
export class ArchilFileSystem implements FileSystem {
  constructor(
    private readonly opts: {
      diskId: string;
      r2AccountId: string;
      r2AccessKeyId: string;
      r2SecretAccessKey: string;
      bucket: string;
      cdnBaseUrl: string;
    },
  ) {}

  async read(_path: string): Promise<Uint8Array | null> {
    throw new Error("Archil/R2 read not implemented yet — see SPEC.md §15/§16. Use the mock.");
  }

  async write(
    _path: string,
    _data: Uint8Array | string,
    _o?: { public?: boolean },
  ): Promise<WriteResult> {
    throw new Error("Archil/R2 write not implemented yet — see SPEC.md §15/§16. Use the mock.");
  }

  async list(_prefix?: string): Promise<string[]> {
    throw new Error("Archil/R2 list not implemented yet — see SPEC.md §15/§16. Use the mock.");
  }

  // The personal CDN: a public-prefixed object is served at CDN_BASE/key. No SDK needed.
  publicUrl(path: string): string {
    const base = this.opts.cdnBaseUrl.replace(/\/$/, "");
    return `${base}/${path.replace(/^\//, "")}`;
  }
}
