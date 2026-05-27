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
  // Create a Stripe Checkout session to top up THIS key's credits (the topupUrl a 402 points at).
  createTopup: op({ method: "POST", path: "/v1/topup", inputFrom: "body",
    input: z.object({ amountCents: z.number() }),
    output: z.object({ url: z.string() }), costCents: 0,
    summary: "Create a Stripe checkout to top up credits", serve: { gateway: true } }),
  // Self-serve signup (public, no key): buy a key + starting credits, then claim it once paid.
  signup: op({ method: "POST", path: "/v1/signup", inputFrom: "body",
    input: z.object({ amountCents: z.number(), scopes: z.array(z.string()).optional() }),
    output: z.object({ url: z.string(), claimToken: z.string() }), costCents: 0, auth: "public",
    summary: "Start self-serve signup — Stripe checkout that mints a key", serve: { gateway: true } }),
  // Poll a signup claim (public, no key): returns the minted key once the checkout is paid.
  claimSignup: op({ method: "POST", path: "/v1/signup/claim", inputFrom: "body",
    input: z.object({ claimToken: z.string() }),
    output: z.object({ status: z.string(), apiKey: z.string().optional(), accountId: z.string().optional(), creditsCents: z.number().optional() }),
    costCents: 0, auth: "public", summary: "Claim a paid signup and retrieve the key", serve: { gateway: true } }),
  // Poll a Checkout session and credit it (idempotent) — fulfillment without a configured webhook.
  confirmTopup: op({ method: "POST", path: "/v1/topup/confirm", inputFrom: "body",
    input: z.object({ sessionId: z.string() }),
    output: z.object({ status: z.string(), creditsCents: z.number().optional() }), costCents: 0,
    summary: "Confirm/poll a top-up Checkout session", serve: { gateway: true } }),
};
