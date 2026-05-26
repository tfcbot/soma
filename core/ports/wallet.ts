// WalletPort — prepaid virtual card; pay for what a job needs. Adapter: AgentCard (or mock).
export interface Wallet {
  charge(input: {
    amount: number;
    currency: string;
    memo: string;
  }): Promise<{ id: string; ok: boolean }>;
}
