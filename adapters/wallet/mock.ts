import type { Wallet, IssuedCard } from "../../core/ports/wallet";

// Mock + spy: records every card issuance so tests can assert spend behavior.
export class MockWallet implements Wallet {
  readonly issued: { amountCents: number; memo: string }[] = [];

  async issueCard(input: { amountCents: number; memo: string }): Promise<IssuedCard> {
    this.issued.push(input);
    return {
      id: `card_mock_${this.issued.length}`,
      pan: "4242424242424242",
      cvv: "123",
      expiry: "12/30",
      spendLimitCents: input.amountCents,
      last4: "4242",
    };
  }
}
