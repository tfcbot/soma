import type { Sandbox, ExecResult } from "../../core/ports/sandbox";

// Real adapter — Freestyle (npm: `freestyle`). VM + git in one vendor: full Linux (install
// ffmpeg), no 5-min cap, repo mounted at the workdir, server-side git with branches.
// Shape: `const { vm } = await freestyle.vms.create({ gitRepos: [{ repo, path: "/workspace" }] })`
//        then `await vm.exec(cmd)`; stage via the VM filesystem API.
// TODO(SPEC §15): confirm VM CPU/mem/disk limits + pricing (the one doc gap; drives unit econ).
// Alt adapter (deferred): ComputeSDK over E2B/Modal/Vercel for provider portability (SPEC §16).
export class FreestyleSandbox implements Sandbox {
  constructor(private readonly apiKey: string) {}

  async exec(_command: string): Promise<ExecResult> {
    void this.apiKey;
    throw new Error("Freestyle sandbox not implemented yet — see SPEC.md §15. Use the mock.");
  }

  async putFile(_path: string, _data: Uint8Array | string): Promise<void> {
    throw new Error("Freestyle sandbox not implemented yet — see SPEC.md §15. Use the mock.");
  }

  async getFile(_path: string): Promise<Uint8Array | null> {
    throw new Error("Freestyle sandbox not implemented yet — see SPEC.md §15. Use the mock.");
  }

  async dispose(): Promise<void> {
    // no-op until wired
  }
}
