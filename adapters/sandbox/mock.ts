import type { Sandbox, ExecResult } from "../../core/ports/sandbox";

// Mock + spy. The working tree is module-level so files written in one gateway call are readable
// in the next (each call builds a fresh adapter); spy fields stay per-instance for unit tests.
const files = new Map<string, Uint8Array>();

export class MockSandbox implements Sandbox {
  readonly commands: string[] = [];
  disposed = false;

  async exec(command: string): Promise<ExecResult> {
    this.commands.push(command);
    return { stdout: `[mock] ran: ${command}`, stderr: "", exitCode: 0 };
  }

  async putFile(path: string, data: Uint8Array | string): Promise<void> {
    files.set(path, typeof data === "string" ? new TextEncoder().encode(data) : data);
  }

  async getFile(path: string): Promise<Uint8Array | null> {
    return files.get(path) ?? null;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    files.clear();
  }
}
