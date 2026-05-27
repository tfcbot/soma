import type { PhonePort, Input, Output } from "../../packages/contract/src/index";

// Real adapter — AgentPhone (REST). Live SMS needs A2P 10DLC registration first.
export class AgentPhone implements PhonePort {
  constructor(
    private readonly apiKey: string,
    private readonly agentId: string,
  ) {}

  async sendSms(input: Input<"phoneSendSms">): Promise<Output<"phoneSendSms">> {
    const res = await fetch("https://api.agentphone.ai/v1/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: this.agentId, to_number: input.to, body: input.body }),
    });
    if (!res.ok) throw new Error(`AgentPhone send failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { id: string };
    return { id: json.id };
  }
}
