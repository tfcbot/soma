"use node";
import type { Ports } from "../packages/contract/src/index";
import { buildPhone } from "../modules/phone/server";
import { buildEmail } from "../modules/email/server";
import { buildWallet } from "../modules/wallet/server";
import { buildSandbox } from "../modules/sandbox/server";
import { buildFileSystem } from "../modules/filesystem/server";

// Each capability module owns its real-or-mock decision (its server.ts). Add a capability =
// its module + one line here.
export function buildPorts(env: NodeJS.ProcessEnv = process.env): Ports {
  return {
    phone: buildPhone(env),
    email: buildEmail(env),
    wallet: buildWallet(env),
    sandbox: buildSandbox(env),
    filesystem: buildFileSystem(env),
  };
}
