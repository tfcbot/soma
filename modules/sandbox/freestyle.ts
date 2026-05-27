import type { SandboxPort } from "./operations";
import { Freestyle, type Vm } from "freestyle";

// Real adapter — Freestyle (full-Linux VM, ffmpeg, no 5-min cap). Binary crosses as base64.
// TODO(SPEC §5.4): persist the VM per account so exec/getFile across calls share a working tree.
export class FreestyleSandbox implements SandboxPort {
  private readonly client: Freestyle;
  private vm: Vm | null = null;
  constructor(apiKey: string) { this.client = new Freestyle({ apiKey }); }
  private async ensureVm(): Promise<Vm> {
    if (this.vm) return this.vm;
    const { vm } = await this.client.vms.create();
    this.vm = vm;
    return vm;
  }
  async exec(input: { command: string }) {
    const r = await (await this.ensureVm()).exec(input.command);
    return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", exitCode: r.statusCode ?? 0 };
  }
  async putFile(input: { path: string; data: string }) {
    await (await this.ensureVm()).fs.writeFile(input.path, Buffer.from(input.data, "base64"));
    return { path: input.path };
  }
  async getFile(input: { path: string }) {
    try {
      const buf = await (await this.ensureVm()).fs.readFile(input.path);
      return { data: Buffer.from(buf).toString("base64") };
    } catch {
      return { data: null };
    }
  }
  async dispose() {
    if (this.vm) { await this.vm.suspend(); this.vm = null; }
    return { ok: true };
  }
}
