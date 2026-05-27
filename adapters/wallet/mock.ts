import type { WalletPort, Input, Output } from "../../packages/contract/src/index";

export class MockWallet implements WalletPort {
  readonly issued: Input<"walletIssueCard">[] = [];
  async issueCard(input: Input<"walletIssueCard">): Promise<Output<"walletIssueCard">> {
    this.issued.push(input);
    return {
      id: `card_mock_${this.issued.length}`,
      pan: "4242424242424242", cvv: "123", expiry: "12/30",
      spendLimitCents: input.amountCents, last4: "4242",
    };
  }
}
