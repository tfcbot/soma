import type { Wallet, IssuedCard } from "../../core/ports/wallet";

export class MockWallet implements Wallet {
  async issueCard(input: { amountCents: number; memo: string }): Promise<IssuedCard> {
    console.log(`[mock:wallet] issue card limit $${(input.amountCents / 100).toFixed(2)} — ${input.memo}`);
    return {
      id: `card_mock_${Date.now()}`,
      pan: "4242424242424242",
      cvv: "123",
      expiry: "12/30",
      spendLimitCents: input.amountCents,
      last4: "4242",
    };
  }
}
