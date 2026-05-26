import type { Sandbox, ExecResult } from "../../core/ports/sandbox";
import { Freestyle, type Vm } from "freestyle";

// Real adapter — Freestyle (SDK `freestyle`). A full-Linux VM (install ffmpeg, no 5-min cap).
// One VM is created lazily and reused; dispose() suspends it. Binary IO via vm.fs.read/writeFile.
// TODO(SPEC §15): confirm VM CPU/mem/disk limits + pricing (drives unit economics). For git
// versioning, run git via exec against the mounted workspace (core/services/versioning.ts).
export class FreestyleSandbox implements Sandbox {
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

  async exec(command: string): Promise<ExecResult> {
    const vm = await this.ensureVm();
    const r = await vm.exec(command);
    return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", exitCode: r.statusCode ?? 0 };
  }

  async putFile(path: string, data: Uint8Array | string): Promise<void> {
    const vm = await this.ensureVm();
    await vm.fs.writeFile(path, Buffer.from(data as Uint8Array | string));
  }

  async getFile(path: string): Promise<Uint8Array | null> {
    const vm = await this.ensureVm();
    try {
      const buf = await vm.fs.readFile(path);
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async dispose(): Promise<void> {
    if (this.vm) {
      await this.vm.suspend();
      this.vm = null;
    }
  }
}
