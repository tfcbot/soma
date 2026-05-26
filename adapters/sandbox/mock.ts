import type { Sandbox, ExecResult } from "../../core/ports/sandbox";

// In-memory sandbox: logs commands, keeps a fake working tree. For local/mock mode + tests.
export class MockSandbox implements Sandbox {
  private readonly files = new Map<string, Uint8Array>();

  async exec(command: string): Promise<ExecResult> {
    console.log(`[mock:sandbox] exec: ${command}`);
    return { stdout: `[mock] ran: ${command}`, stderr: "", exitCode: 0 };
  }

  async putFile(path: string, data: Uint8Array | string): Promise<void> {
    this.files.set(path, typeof data === "string" ? new TextEncoder().encode(data) : data);
  }

  async getFile(path: string): Promise<Uint8Array | null> {
    return this.files.get(path) ?? null;
  }

  async dispose(): Promise<void> {
    this.files.clear();
  }
}
