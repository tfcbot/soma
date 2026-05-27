import type { PhonePort } from "./operations";

// Real adapter — AgentPhone (REST). Live SMS needs A2P 10DLC registration first.
export class AgentPhone implements PhonePort {
  constructor(private readonly apiKey: string, private readonly agentId: string) {}
  async sendSms(input: { to: string; body: string }) {
    const res = await fetch("https://api.agentphone.ai/v1/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: this.agentId, to_number: input.to, body: input.body }),
    });
    if (!res.ok) throw new Error(`AgentPhone send failed: ${res.status} ${await res.text()}`);
    return { id: ((await res.json()) as { id: string }).id };
  }
}
