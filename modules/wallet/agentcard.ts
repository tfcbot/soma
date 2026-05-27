import type { WalletPort } from "./operations";

// Real adapter — AgentCard (REST). Prepaid card; the limit is the ceiling.
// NOTE: pan/cvv are sensitive — never log them.
const BASE = "https://api.agentcard.sh/api/v1";
interface CardDetails { pan: string; cvv: string; expiry: string; spendLimitCents?: number }

export class AgentCard implements WalletPort {
  constructor(private readonly apiKey: string, private readonly cardholderId: string) {}
  async issueCard(input: Parameters<WalletPort["issueCard"]>[0]) {
    const created = await this.req<{ id: string }>("POST", "/cards", {
      amountCents: input.amountCents, cardholderId: this.cardholderId,
    });
    const d = await this.req<CardDetails>("GET", `/cards/${created.id}/details`);
    return {
      id: created.id, pan: d.pan, cvv: d.cvv, expiry: d.expiry,
      spendLimitCents: d.spendLimitCents ?? input.amountCents, last4: d.pan?.slice(-4),
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
