import type { Wallet } from "../../core/ports/wallet";

// Real adapter — AgentCard (prepaid virtual Visa). TODO(SPEC §15): confirm spend-control /
// merchant-locking support, cardholder identity model, and KYC/ToS posture before enabling
// autonomous spend. Charges must stay within the prepaid ceiling (the budget envelope).
export class AgentCard implements Wallet {
  constructor(private readonly apiKey: string) {}

  async charge(_input: {
    amount: number;
    currency: string;
    memo: string;
  }): Promise<{ id: string; ok: boolean }> {
    void this.apiKey;
    throw new Error("AgentCard adapter not implemented yet — see SPEC.md §15. Use the mock.");
  }
}
