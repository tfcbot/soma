import { api } from "./_generated/api";
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
};
