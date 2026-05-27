import type { FileSystemPort } from "./operations";
const blobs = new Map<string, Buffer>();
export class MockFileSystem implements FileSystemPort {
  async read(input: { path: string }) {
    const b = blobs.get(input.path);
    return { data: b ? b.toString("base64") : null };
  }
  async write(input: { path: string; data: string; public?: boolean }) {
    blobs.set(input.path, Buffer.from(input.data, "base64"));
    return { path: input.path, url: input.public ? `mock://${input.path}` : undefined };
  }
  async list(input: { prefix?: string }) {
    const prefix = input.prefix ?? "";
    return { paths: [...blobs.keys()].filter((k) => k.startsWith(prefix)) };
  }
  async publicUrl(input: { path: string }) { return { url: `mock://${input.path}` }; }
}
