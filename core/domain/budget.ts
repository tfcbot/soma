// The budget envelope (SPEC.md §11). The wallet is prepaid; the envelope is the
// authorized scope + ceiling. A charge that would breach the ceiling is refused.

export interface BudgetEnvelope {
  authorized: number;
  spent: number;
  currency: string;
}

export class BudgetExceededError extends Error {
  constructor(amount: number, remaining: number, currency: string) {
    super(`Charge ${amount} ${currency} exceeds remaining budget ${remaining} ${currency}`);
    this.name = "BudgetExceededError";
  }
}

export function remaining(env: BudgetEnvelope): number {
  return env.authorized - env.spent;
}

/** Returns the next envelope after a charge, or throws if it breaches the ceiling. */
export function applyCharge(env: BudgetEnvelope, amount: number): BudgetEnvelope {
  if (amount > remaining(env)) {
    throw new BudgetExceededError(amount, remaining(env), env.currency);
  }
  return { ...env, spent: env.spent + amount };
}
