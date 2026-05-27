import type { FileSystemPort, Input, Output } from "../../packages/contract/src/index";

// In-memory FS with stable mock:// URLs. Module-level store so state persists across calls.
const blobs = new Map<string, Buffer>();

export class MockFileSystem implements FileSystemPort {
  async read(input: Input<"fsRead">): Promise<Output<"fsRead">> {
    const b = blobs.get(input.path);
    return { data: b ? b.toString("base64") : null };
  }
  async write(input: Input<"fsWrite">): Promise<Output<"fsWrite">> {
    blobs.set(input.path, Buffer.from(input.data, "base64"));
    return { path: input.path, url: input.public ? `mock://${input.path}` : undefined };
  }
  async list(input: Input<"fsList">): Promise<Output<"fsList">> {
    const prefix = input.prefix ?? "";
    return { paths: [...blobs.keys()].filter((k) => k.startsWith(prefix)) };
  }
  async publicUrl(input: Input<"fsPublicUrl">): Promise<Output<"fsPublicUrl">> {
    return { url: `mock://${input.path}` };
  }
}
