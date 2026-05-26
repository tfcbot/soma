// StoragePort — hold state, versions, and deliverables. Adapter: Archil (or mock).
// Returns a pointer (url) that other primitives reference (e.g. email attachments).
export interface Storage {
  put(key: string, data: Uint8Array | string): Promise<{ url: string }>;
  get(key: string): Promise<Uint8Array | null>;
  list(prefix?: string): Promise<string[]>;
}
