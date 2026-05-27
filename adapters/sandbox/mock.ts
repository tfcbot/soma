import type { SandboxPort, Input, Output } from "../../packages/contract/src/index";

// Mock + spy. Module-level tree so a file written in one gateway call is readable in the next.
const files = new Map<string, Buffer>();

export class MockSandbox implements SandboxPort {
  readonly commands: string[] = [];
  disposed = false;
  async exec(input: Input<"sandboxExec">): Promise<Output<"sandboxExec">> {
    this.commands.push(input.command);
    return { stdout: `[mock] ran: ${input.command}`, stderr: "", exitCode: 0 };
  }
  async putFile(input: Input<"sandboxPutFile">): Promise<Output<"sandboxPutFile">> {
    files.set(input.path, Buffer.from(input.data, "base64"));
    return { path: input.path };
  }
  async getFile(input: Input<"sandboxGetFile">): Promise<Output<"sandboxGetFile">> {
    const b = files.get(input.path);
    return { data: b ? b.toString("base64") : null };
  }
  async dispose(_input: Input<"sandboxDispose">): Promise<Output<"sandboxDispose">> {
    this.disposed = true;
    files.clear();
    return { ok: true };
  }
}
