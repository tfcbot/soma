import type { FileSystem, WriteResult } from "../../core/ports/filesystem";

// In-memory filesystem with stable mock:// public URLs. Module-level store so state persists
// across separate gateway calls (each call builds a fresh adapter); the real R2 adapter persists
// inherently. For local/mock mode + tests.
const blobs = new Map<string, Uint8Array>();

export class MockFileSystem implements FileSystem {
  async read(path: string): Promise<Uint8Array | null> {
    return blobs.get(path) ?? null;
  }

  async write(path: string, data: Uint8Array | string, opts?: { public?: boolean }): Promise<WriteResult> {
    blobs.set(path, typeof data === "string" ? new TextEncoder().encode(data) : data);
    return { path, url: opts?.public ? this.publicUrl(path) : undefined };
  }

  async list(prefix = ""): Promise<string[]> {
    return [...blobs.keys()].filter((k) => k.startsWith(prefix));
  }

  publicUrl(path: string): string {
    return `mock://${path}`;
  }
}
