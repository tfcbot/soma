// FileSystemPort — the durable data plane: hold blobs + serve them. Adapter: Archil disk
// backed by an R2 bucket; a public prefix + custom domain = the personal CDN (SPEC §16).
// This is the system of record; the Sandbox stages from it and persists back to it.
export interface WriteResult {
  path: string;
  url?: string; // present when written under a public prefix → a CDN URL
}

export interface FileSystem {
  read(path: string): Promise<Uint8Array | null>;
  write(
    path: string,
    data: Uint8Array | string,
    opts?: { public?: boolean },
  ): Promise<WriteResult>;
  list(prefix?: string): Promise<string[]>;
  publicUrl(path: string): string; // CDN_BASE + key, for public-prefixed paths
}
