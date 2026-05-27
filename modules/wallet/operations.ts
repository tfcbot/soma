import { z } from "zod";
import { op } from "../../packages/contract/src/op";

const issueInput = z.object({ amountCents: z.number(), memo: z.string() });
const card = z.object({
  id: z.string(), pan: z.string(), cvv: z.string(), expiry: z.string(),
  spendLimitCents: z.number(), last4: z.string().optional(),
});

export const ops = {
  walletIssueCard: op({
    method: "POST", path: "/v1/wallet/cards", inputFrom: "body",
    input: issueInput, output: card,
    costCents: 50, summary: "Issue a prepaid card",
    serve: { port: "wallet", method: "issueCard" },
  }),
};

export interface WalletPort {
  issueCard(input: z.infer<typeof issueInput>): Promise<z.infer<typeof card>>;
}
