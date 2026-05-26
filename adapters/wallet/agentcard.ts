import type { Wallet, IssuedCard } from "../../core/ports/wallet";

// Real adapter — AgentCard (REST, no SDK). Base https://api.agentcard.sh/api/v1, Bearer key.
// Issues a prepaid card under a fixed cardholder; the prepaid limit is the budget ceiling.
// NOTE: pan/cvv are sensitive — never log them (see feedback_no_terminal_creds).
const BASE = "https://api.agentcard.sh/api/v1";

interface CardDetails {
  pan: string;
  cvv: string;
  expiry: string;
  spendLimitCents?: number;
}

export class AgentCard implements Wallet {
  constructor(
    private readonly apiKey: string,
    private readonly cardholderId: string,
  ) {}

  async issueCard(input: { amountCents: number; memo: string }): Promise<IssuedCard> {
    const created = await this.req<{ id: string }>("POST", "/cards", {
      amountCents: input.amountCents,
      cardholderId: this.cardholderId,
    });
    const details = await this.req<CardDetails>("GET", `/cards/${created.id}/details`);
    return {
      id: created.id,
      pan: details.pan,
      cvv: details.cvv,
      expiry: details.expiry,
      spendLimitCents: details.spendLimitCents ?? input.amountCents,
      last4: details.pan?.slice(-4),
    };
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`AgentCard ${method} ${path} failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }
}
