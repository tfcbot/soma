import type { Phone } from "../../core/ports/phone";

// Real adapter — AgentPhone. TODO(SPEC §15): wire the AgentPhone send API + confirm A2P
// 10DLC registration and outbound media limits before relying on it.
export class AgentPhone implements Phone {
  constructor(private readonly apiKey: string) {}

  async sendSms(_to: string, _body: string): Promise<{ id: string }> {
    void this.apiKey;
    throw new Error("AgentPhone adapter not implemented yet — see SPEC.md §15. Use the mock.");
  }
}
