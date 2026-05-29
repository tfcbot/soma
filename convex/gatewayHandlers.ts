import { api, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Account } from "./auth";
import type { Input } from "../packages/contract/src/index";

// Gateway ops don't touch vendors — they read the account / event ledger in the isolate runtime.
// (Port ops go through convex/invoke.ts instead.)
export const gatewayHandlers: Record<
  string,
  (ctx: ActionCtx, account: Account, input: unknown) => Promise<unknown>
> = {
  // Public, keyless: derive each capability's backend from env presence (mirrors the real-or-mock
  // decision each module's server.ts makes — sandbox needs VERCEL_TOKEN, filesystem needs R2 keys).
  getHealth: async () => ({
    status: "ok" as const,
    backends: {
      sandbox: process.env.VERCEL_TOKEN ? "vercel" : "mock",
      filesystem: process.env.R2_ACCESS_KEY_ID ? "r2" : "mock",
    },
  }),
  getBalance: async (_ctx, account) => ({
    accountId: account.accountId,
    creditsCents: account.creditsCents,
    spentCents: account.spentCents,
  }),
  listEvents: async (ctx, account, input) => ({
    events: await ctx.runQuery(api.events.listByAccount, {
      accountId: account.accountId,
      limit: (input as Input<"listEvents">).limit,
    }),
  }),
  createTopup: async (ctx, account, input) =>
    ctx.runAction(internal.payments.createTopupCheckout, {
      accountId: account.accountId,
      amountCents: (input as Input<"createTopup">).amountCents,
    }),
  confirmTopup: async (ctx, account, input) =>
    ctx.runAction(internal.payments.confirmTopup, {
      accountId: account.accountId,
      sessionId: (input as Input<"confirmTopup">).sessionId,
    }),
  // Public (no account) — self-serve signup + claim.
  signup: async (ctx, _account, input) =>
    ctx.runAction(internal.payments.createSignupCheckout, {
      amountCents: (input as Input<"signup">).amountCents,
      scopes: (input as Input<"signup">).scopes,
    }),
  claimSignup: async (ctx, _account, input) =>
    ctx.runAction(internal.payments.claimSignup, {
      claimToken: (input as Input<"claimSignup">).claimToken,
    }),
};
