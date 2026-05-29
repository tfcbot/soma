"use node";
import type { Ports } from "../packages/contract/src/index";
import { buildSandbox } from "../modules/sandbox/server";
import { buildFileSystem } from "../modules/filesystem/server";

// Each capability module owns its real-or-mock decision (its server.ts). Add a capability =
// its module + one line here. accountId is threaded for adapters that scope state per caller
// (notably Sandbox, whose Vercel adapter resumes a per-account snapshot by name).
export function buildPorts(env: NodeJS.ProcessEnv = process.env, accountId: string): Ports {
  return {
    sandbox: buildSandbox(env, accountId),
    filesystem: buildFileSystem(env),
  };
}
