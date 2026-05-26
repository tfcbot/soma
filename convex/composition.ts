import type { ActionCtx } from "./_generated/server";
import type { Ports } from "../core/services/assistant";

import { convexTodoStore } from "./adapters/todoStore";

import { MockPhone } from "../adapters/phone/mock";
import { MockEmail } from "../adapters/email/mock";
import { MockWallet } from "../adapters/wallet/mock";
import { MockComputer } from "../adapters/computer/mock";
import { MockStorage } from "../adapters/storage/mock";

import { AgentPhone } from "../adapters/phone/agentphone";
import { AgentMail } from "../adapters/email/agentmail";
import { AgentCard } from "../adapters/wallet/agentcard";
import { FreestyleComputer } from "../adapters/computer/freestyle";
import { ArchilStorage } from "../adapters/storage/archil";

// The composition root. Wire each port to its real adapter when the key is present,
// otherwise the mock. The todo store is always Convex DB (the host is the persistent store).
export function buildPorts(ctx: ActionCtx): Ports {
  const env = process.env;
  return {
    todos: convexTodoStore(ctx),
    phone: env.AGENTPHONE_API_KEY ? new AgentPhone(env.AGENTPHONE_API_KEY) : new MockPhone(),
    email:
      env.AGENTMAIL_API_KEY && env.AGENTMAIL_INBOX_ID
        ? new AgentMail(env.AGENTMAIL_API_KEY, env.AGENTMAIL_INBOX_ID)
        : new MockEmail(),
    wallet: env.AGENTCARD_API_KEY ? new AgentCard(env.AGENTCARD_API_KEY) : new MockWallet(),
    computer: env.FREESTYLE_API_KEY
      ? new FreestyleComputer(env.FREESTYLE_API_KEY)
      : new MockComputer(),
    storage:
      env.ARCHIL_API_KEY && env.ARCHIL_DISK_ID
        ? new ArchilStorage(env.ARCHIL_API_KEY, env.ARCHIL_DISK_ID)
        : new MockStorage(),
  };
}
