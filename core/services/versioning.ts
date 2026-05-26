import type { Sandbox } from "../ports/sandbox";

// Versioning is a convention over the Sandbox primitive: git runs *in the sandbox* against the
// mounted workspace (SPEC §16). No VersionPort yet — when multi-tenant needs server-enforced
// read-only, promote this to a port with a Freestyle-Git adapter.
function q(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export class Versioning {
  constructor(private readonly sandbox: Sandbox) {}

  init() {
    return this.sandbox.exec("git init -q && git checkout -q -b wip");
  }

  commit(message: string) {
    return this.sandbox.exec(`git add -A && git commit -q -m ${q(message)}`);
  }

  // Ship: fast-forward `wip` into `delivered` (the branch a push-trigger would watch later).
  deliver() {
    return this.sandbox.exec(
      "git checkout -q delivered 2>/dev/null || git checkout -q -b delivered; " +
        "git merge -q wip -m 'deliver'",
    );
  }

  diff(ref = "HEAD~1") {
    return this.sandbox.exec(`git diff ${q(ref)}`);
  }
}
