// The credit balance (the caller-pays-the-provider axis). Pure domain — no persistence.
// Distinct from the budget envelope (core/domain/budget.ts), which caps the AGENT's vendor
// spend per todo. Credits are what the CALLER spends with the provider to use the contract.

export interface CreditBalance {
  creditsCents: number; // remaining prepaid balance
  spentCents: number; // lifetime spent (for reporting)
}

export class InsufficientCreditsError extends Error {
  constructor(
    readonly required: number,
    readonly balance: number,
  ) {
    super(`Insufficient credits: this call costs ${required}, balance is ${balance}`);
    this.name = "InsufficientCreditsError";
  }
}

/** Returns the next balance after debiting `cost`, or throws if the balance can't cover it. */
export function debit(balance: CreditBalance, cost: number): CreditBalance {
  if (cost > balance.creditsCents) {
    throw new InsufficientCreditsError(cost, balance.creditsCents);
  }
  return {
    creditsCents: balance.creditsCents - cost,
    spentCents: balance.spentCents + cost,
  };
}

/** Returns the next balance after crediting `amount` (top-up or refund). */
export function credit(balance: CreditBalance, amount: number): CreditBalance {
  return {
    creditsCents: balance.creditsCents + amount,
    spentCents: Math.max(0, balance.spentCents - amount),
  };
}
