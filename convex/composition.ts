import type { ActionCtx } from "./_generated/server";
import type { Ports } from "../core/services/assistant";

import { convexTodoStore } from "./adapters/todoStore";

import { MockPhone } from "../adapters/phone/mock";
import { MockEmail } from "../adapters/email/mock";
import { MockWallet } from "../adapters/wallet/mock";
import { MockSandbox } from "../adapters/sandbox/mock";
import { MockFileSystem } from "../adapters/filesystem/mock";

import { AgentPhone } from "../adapters/phone/agentphone";
import { AgentMail } from "../adapters/email/agentmail";
import { AgentCard } from "../adapters/wallet/agentcard";
import { FreestyleSandbox } from "../adapters/sandbox/freestyle";
import { ArchilFileSystem } from "../adapters/filesystem/archil";

// The composition root. Each port → real adapter when its key(s) are present, else the mock.
// The todo store is always Convex DB (the host is the persistent store).
export function buildPorts(ctx: ActionCtx): Ports {
  const env = process.env;
  const hasArchil =
    env.ARCHIL_DISK_ID &&
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_ACCESS_KEY_SECRET &&
    env.R2_BUCKET_NAME &&
    env.CDN_BASE_URL;

  return {
    todos: convexTodoStore(ctx),
    phone: env.AGENTPHONE_API_KEY ? new AgentPhone(env.AGENTPHONE_API_KEY) : new MockPhone(),
    email:
      env.AGENTMAIL_API_KEY && env.AGENTMAIL_INBOX_ID
        ? new AgentMail(env.AGENTMAIL_API_KEY, env.AGENTMAIL_INBOX_ID)
        : new MockEmail(),
    wallet: env.AGENTCARD_API_KEY ? new AgentCard(env.AGENTCARD_API_KEY) : new MockWallet(),
    sandbox: env.FREESTYLE_API_KEY
      ? new FreestyleSandbox(env.FREESTYLE_API_KEY)
      : new MockSandbox(),
    filesystem: hasArchil
      ? new ArchilFileSystem({
          diskId: env.ARCHIL_DISK_ID!,
          r2AccountId: env.R2_ACCOUNT_ID!,
          r2AccessKeyId: env.R2_ACCESS_KEY_ID!,
          r2SecretAccessKey: env.R2_ACCESS_KEY_SECRET!,
          bucket: env.R2_BUCKET_NAME!,
          cdnBaseUrl: env.CDN_BASE_URL!,
        })
      : new MockFileSystem(),
  };
}
