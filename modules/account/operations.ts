import { z } from "zod";
import { op } from "../../packages/contract/src/op";

const balance = z.object({ accountId: z.string(), creditsCents: z.number(), spentCents: z.number() });
const event = z.object({ op: z.string(), costCents: z.number(), status: z.string(), ts: z.number() });

export const ops = {
  getBalance: op({ method: "GET", path: "/v1/balance", inputFrom: "query",
    input: z.object({}), output: balance, costCents: 0,
    summary: "Get the calling key's credit balance", serve: { gateway: true } }),
  listEvents: op({ method: "GET", path: "/v1/events", inputFrom: "query",
    input: z.object({ limit: z.coerce.number().optional() }),
    output: z.object({ events: z.array(event) }), costCents: 0,
    summary: "List the calling key's recent usage events", serve: { gateway: true } }),
};
