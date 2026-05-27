import type { PhonePort } from "./operations";
import { AgentPhone } from "./agentphone";
import { MockPhone } from "./mock";

// Real adapter when its env keys are present, else the mock.
export function buildPhone(env: NodeJS.ProcessEnv): PhonePort {
  return env.AGENTPHONE_API_KEY && env.AGENTPHONE_AGENT_ID
    ? new AgentPhone(env.AGENTPHONE_API_KEY, env.AGENTPHONE_AGENT_ID)
    : new MockPhone();
}
