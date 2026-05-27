// The credit balance (the caller-pays-the-provider axis). Pure domain — no persistence.
// Credits are what the CALLER spends with the provider to use the contract.

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

/**
 * Add credits to a balance — the seam every funding path uses (top-up, subscription-style
 * monthly grant, manual credit). Increases the balance; `spentCents` is untouched because no
 * consumption is being reversed. Soma defines this primitive; the payment rail that calls it
 * (Stripe, x402/MPP, a manual `convex run`) is the operator's choice.
 */
export function grant(balance: CreditBalance, amount: number): CreditBalance {
  return {
    creditsCents: balance.creditsCents + amount,
    spentCents: balance.spentCents,
  };
}

/** Reverse a debit (e.g. a vendor op failed after charging): restores balance AND spent. */
export function refund(balance: CreditBalance, amount: number): CreditBalance {
  return {
    creditsCents: balance.creditsCents + amount,
    spentCents: Math.max(0, balance.spentCents - amount),
  };
}
