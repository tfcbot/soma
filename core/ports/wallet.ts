// WalletPort — a prepaid virtual card the agent uses to pay at a merchant. Adapter: AgentCard.
// Note: AgentCard *issues* a card (with a prepaid limit), it does not "charge" — the spend
// happens when the card details are used at checkout. The prepaid limit IS the budget ceiling.
export interface IssuedCard {
  id: string;
  pan: string;
  cvv: string;
  expiry: string;
  spendLimitCents: number;
  last4?: string;
}

export interface Wallet {
  issueCard(input: { amountCents: number; memo: string }): Promise<IssuedCard>;
}
