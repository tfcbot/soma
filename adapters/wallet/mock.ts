import type { Wallet } from "../../core/ports/wallet";

export class MockWallet implements Wallet {
  async charge(input: {
    amount: number;
    currency: string;
    memo: string;
  }): Promise<{ id: string; ok: boolean }> {
    console.log(`[mock:wallet] charge ${input.amount} ${input.currency} — ${input.memo}`);
    return { id: `ch_mock_${Date.now()}`, ok: true };
  }
}
