import type { Storage } from "../../core/ports/storage";

// Real adapter — Archil (no S3). Convex can't FUSE-mount Archil (SPEC §16), so file ops go
// either through the Freestyle VM (which mounts the disk) or Archil's TypeScript SDK for
// small/metadata ops. This adapter targets the SDK path.
// TODO(SPEC §15): confirm the Archil TS SDK surface (put/get/list) + disk addressing.
export class ArchilStorage implements Storage {
  constructor(
    private readonly apiKey: string,
    private readonly diskId: string,
  ) {}

  async put(_key: string, _data: Uint8Array | string): Promise<{ url: string }> {
    void this.apiKey;
    void this.diskId;
    throw new Error("Archil adapter not implemented yet — see SPEC.md §15. Use the mock.");
  }

  async get(_key: string): Promise<Uint8Array | null> {
    throw new Error("Archil adapter not implemented yet — see SPEC.md §15. Use the mock.");
  }

  async list(_prefix?: string): Promise<string[]> {
    throw new Error("Archil adapter not implemented yet — see SPEC.md §15. Use the mock.");
  }
}
