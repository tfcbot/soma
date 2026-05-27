import type { SandboxPort } from "./operations";
// Module-level tree so a file written in one gateway call is readable in the next.
const files = new Map<string, Buffer>();
export class MockSandbox implements SandboxPort {
  readonly commands: string[] = [];
  disposed = false;
  async exec(input: { command: string }) {
    this.commands.push(input.command);
    return { stdout: `[mock] ran: ${input.command}`, stderr: "", exitCode: 0 };
  }
  async putFile(input: { path: string; data: string }) {
    files.set(input.path, Buffer.from(input.data, "base64"));
    return { path: input.path };
  }
  async getFile(input: { path: string }) {
    const b = files.get(input.path);
    return { data: b ? b.toString("base64") : null };
  }
  async dispose() { this.disposed = true; files.clear(); return { ok: true }; }
}
