import type { WalletPort } from "./operations";
export class MockWallet implements WalletPort {
  readonly issued: Parameters<WalletPort["issueCard"]>[0][] = [];
  async issueCard(input: Parameters<WalletPort["issueCard"]>[0]) {
    this.issued.push(input);
    return { id: `card_mock_${this.issued.length}`, pan: "4242424242424242", cvv: "123",
      expiry: "12/30", spendLimitCents: input.amountCents, last4: "4242" };
  }
}
