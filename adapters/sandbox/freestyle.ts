import type { SandboxPort, Input, Output } from "../../packages/contract/src/index";
import { Freestyle, type Vm } from "freestyle";

// Real adapter — Freestyle (full-Linux VM, ffmpeg, no 5-min cap). One VM created lazily + reused.
// Binary crosses the contract as base64; this adapter bridges base64 ⇄ vendor bytes.
// TODO(SPEC §5.4): persist the VM per account so exec/getFile across calls share a working tree.
export class FreestyleSandbox implements SandboxPort {
  private readonly client: Freestyle;
  private vm: Vm | null = null;
  constructor(apiKey: string) {
    this.client = new Freestyle({ apiKey });
  }
  private async ensureVm(): Promise<Vm> {
    if (this.vm) return this.vm;
    const { vm } = await this.client.vms.create();
    this.vm = vm;
    return vm;
  }
  async exec(input: Input<"sandboxExec">): Promise<Output<"sandboxExec">> {
    const vm = await this.ensureVm();
    const r = await vm.exec(input.command);
    return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", exitCode: r.statusCode ?? 0 };
  }
  async putFile(input: Input<"sandboxPutFile">): Promise<Output<"sandboxPutFile">> {
    const vm = await this.ensureVm();
    await vm.fs.writeFile(input.path, Buffer.from(input.data, "base64"));
    return { path: input.path };
  }
  async getFile(input: Input<"sandboxGetFile">): Promise<Output<"sandboxGetFile">> {
    const vm = await this.ensureVm();
    try {
      const buf = await vm.fs.readFile(input.path);
      return { data: Buffer.from(buf).toString("base64") };
    } catch {
      return { data: null };
    }
  }
  async dispose(_input: Input<"sandboxDispose">): Promise<Output<"sandboxDispose">> {
    if (this.vm) {
      await this.vm.suspend();
      this.vm = null;
    }
    return { ok: true };
  }
}
