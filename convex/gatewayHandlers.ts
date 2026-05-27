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
};
