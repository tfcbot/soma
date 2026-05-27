import type { EmailPort } from "./operations";
import { AgentMail } from "./agentmail";
import { MockEmail } from "./mock";
export function buildEmail(env: NodeJS.ProcessEnv): EmailPort {
  return env.AGENTMAIL_API_KEY && env.AGENTMAIL_INBOX_ID
    ? new AgentMail(env.AGENTMAIL_API_KEY, env.AGENTMAIL_INBOX_ID)
    : new MockEmail();
}
