import type { Storage } from "../../core/ports/storage";

// In-memory blob store that hands back stable mock:// pointers.
export class MockStorage implements Storage {
  private readonly blobs = new Map<string, Uint8Array>();

  async put(key: string, data: Uint8Array | string): Promise<{ url: string }> {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    this.blobs.set(key, bytes);
    return { url: `mock://${key}` };
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.blobs.get(key) ?? null;
  }

  async list(prefix = ""): Promise<string[]> {
    return [...this.blobs.keys()].filter((k) => k.startsWith(prefix));
  }
}
