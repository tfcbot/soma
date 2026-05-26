import type { Phone } from "../../core/ports/phone";

// Real adapter — AgentPhone (REST). POST https://api.agentphone.ai/v1/messages, Bearer key,
// body { agent_id, to_number, body, media_urls? }. Live SMS needs A2P 10DLC registration first.
export class AgentPhone implements Phone {
  constructor(
    private readonly apiKey: string,
    private readonly agentId: string,
  ) {}

  async sendSms(to: string, body: string): Promise<{ id: string }> {
    const res = await fetch("https://api.agentphone.ai/v1/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: this.agentId, to_number: to, body }),
    });
    if (!res.ok) throw new Error(`AgentPhone send failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { id: string };
    return { id: json.id };
  }
}
