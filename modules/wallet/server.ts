import type { WalletPort } from "./operations";
import { AgentCard } from "./agentcard";
import { MockWallet } from "./mock";
export function buildWallet(env: NodeJS.ProcessEnv): WalletPort {
  return env.AGENTCARD_API_KEY && env.AGENTCARD_CARDHOLDER_ID
    ? new AgentCard(env.AGENTCARD_API_KEY, env.AGENTCARD_CARDHOLDER_ID)
    : new MockWallet();
}
