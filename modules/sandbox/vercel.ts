import type { SandboxPort } from "./operations";
import { Sandbox } from "@vercel/sandbox";

// Real adapter — Vercel Sandbox (Firecracker microVM + native persistence).
// `getOrCreate({ name: accountId })` gives one persistent working tree per account: every call
// auto-resumes the snapshot. `onCreate` fires once per fresh sandbox; the result lives in the
// snapshot forever. `dispose()` maps to `stop()` (suspend; resumable), not `delete()`.

export interface VercelSandboxOptions {
  accountId: string;
  teamId?: string;
  projectId?: string;
  token?: string;
}

// Best-effort install of ffmpeg + git in the first session. Non-fatal so it succeeds on whatever
// base runtime; on Debian/Ubuntu/Alpine the install lands and survives in the snapshot for free.
const INSTALL_TOOLS =
  "(command -v apt-get >/dev/null && apt-get update -qq && apt-get install -y -qq ffmpeg git ca-certificates) || " +
  "(command -v apk     >/dev/null && apk add --no-cache ffmpeg git ca-certificates) || true";

export class VercelSandbox implements SandboxPort {
  constructor(private readonly opts: VercelSandboxOptions) {}

  private auth() {
    const { teamId, projectId, token } = this.opts;
    return token && teamId && projectId ? { teamId, projectId, token } : {};
  }

  private async box() {
    return Sandbox.getOrCreate({
      ...this.auth(),
      name: this.opts.accountId,
      runtime: "node24",
      keepLastSnapshots: { count: 1 },
      onCreate: async (sbx) => {
        await sbx.runCommand("sh", ["-c", INSTALL_TOOLS]);
      },
    } as Parameters<typeof Sandbox.getOrCreate>[0]);
  }

  async exec(input: { command: string }) {
    const sbx = await this.box();
    const r = await sbx.runCommand("sh", ["-c", input.command]);
    // Vercel SDK: stdout/stderr are async callables — invoke to get the captured strings.
    const [stdout, stderr] = await Promise.all([r.stdout(), r.stderr()]);
    return { stdout: stdout ?? "", stderr: stderr ?? "", exitCode: r.exitCode ?? 0 };
  }

  async putFile(input: { path: string; data: string }) {
    const sbx = await this.box();
    await sbx.writeFiles([{ path: input.path, content: Buffer.from(input.data, "base64") }]);
    return { path: input.path };
  }

  async getFile(input: { path: string }) {
    const sbx = await this.box();
    // base64-encode through the shell to round-trip binary safely.
    const r = await sbx.runCommand("sh", ["-c", `base64 -w0 ${JSON.stringify(input.path)} 2>/dev/null || true`]);
    const stdout = await r.stdout();
    const data = (stdout ?? "").trim();
    return { data: data && (r.exitCode ?? 0) === 0 ? data : null };
  }

  async dispose() {
    const sbx = await this.box();
    await sbx.stop(); // snapshot + resumable; not a permanent delete
    return { ok: true };
  }
}
