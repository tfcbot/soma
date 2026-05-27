"use node";
import type { Ports } from "../packages/contract/src/index";
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

// The port registry: each port → real adapter when its env keys are present, else the mock.
// Adding a new primitive/module = its ops in the contract + its adapter + ONE line here.
export function buildPorts(env: NodeJS.ProcessEnv = process.env): Ports {
  const hasArchil =
    env.ARCHIL_DISK_ID && env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID &&
    env.R2_ACCESS_KEY_SECRET && env.R2_BUCKET_NAME && env.CDN_BASE_URL;
  return {
    phone:
      env.AGENTPHONE_API_KEY && env.AGENTPHONE_AGENT_ID
        ? new AgentPhone(env.AGENTPHONE_API_KEY, env.AGENTPHONE_AGENT_ID)
        : new MockPhone(),
    email:
      env.AGENTMAIL_API_KEY && env.AGENTMAIL_INBOX_ID
        ? new AgentMail(env.AGENTMAIL_API_KEY, env.AGENTMAIL_INBOX_ID)
        : new MockEmail(),
    wallet:
      env.AGENTCARD_API_KEY && env.AGENTCARD_CARDHOLDER_ID
        ? new AgentCard(env.AGENTCARD_API_KEY, env.AGENTCARD_CARDHOLDER_ID)
        : new MockWallet(),
    sandbox: env.FREESTYLE_API_KEY ? new FreestyleSandbox(env.FREESTYLE_API_KEY) : new MockSandbox(),
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
