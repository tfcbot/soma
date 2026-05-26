import type { Sandbox, ExecResult } from "../../core/ports/sandbox";

// Mock + spy: records exec'd commands and keeps a fake working tree. For mock mode + tests.
export class MockSandbox implements Sandbox {
  readonly commands: string[] = [];
  private readonly files = new Map<string, Uint8Array>();
  disposed = false;

  async exec(command: string): Promise<ExecResult> {
    this.commands.push(command);
    return { stdout: `[mock] ran: ${command}`, stderr: "", exitCode: 0 };
  }

  async putFile(path: string, data: Uint8Array | string): Promise<void> {
    this.files.set(path, typeof data === "string" ? new TextEncoder().encode(data) : data);
  }

  async getFile(path: string): Promise<Uint8Array | null> {
    return this.files.get(path) ?? null;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.files.clear();
  }
}
