import type { FileSystem, WriteResult } from "../../core/ports/filesystem";

// In-memory filesystem with stable mock:// public URLs. For local/mock mode + tests.
export class MockFileSystem implements FileSystem {
  private readonly blobs = new Map<string, Uint8Array>();

  async read(path: string): Promise<Uint8Array | null> {
    return this.blobs.get(path) ?? null;
  }

  async write(
    path: string,
    data: Uint8Array | string,
    opts?: { public?: boolean },
  ): Promise<WriteResult> {
    this.blobs.set(path, typeof data === "string" ? new TextEncoder().encode(data) : data);
    return { path, url: opts?.public ? this.publicUrl(path) : undefined };
  }

  async list(prefix = ""): Promise<string[]> {
    return [...this.blobs.keys()].filter((k) => k.startsWith(prefix));
  }

  publicUrl(path: string): string {
    return `mock://${path}`;
  }
}
