import { internal, api } from "./_generated/api";
import type { Handlers } from "./gateway";

// The typed handler map — the one place per-operation logic lives. Typed against the registry
// (Handlers), so a missing or mis-shaped handler is a COMPILE error. Faculty handlers delegate
// to Node-runtime actions (vendor SDKs); gateway-facing reads run inline.
export const handlers: Handlers = {
  phoneSendSms: (ctx, _a, input) => ctx.runAction(internal.node.phoneSendSms, input),
  emailSend: (ctx, _a, input) => ctx.runAction(internal.node.emailSend, input),
  walletIssueCard: (ctx, _a, input) => ctx.runAction(internal.node.walletIssueCard, input),

  sandboxExec: (ctx, _a, input) => ctx.runAction(internal.node.sandboxExec, input),
  sandboxPutFile: (ctx, _a, input) => ctx.runAction(internal.node.sandboxPutFile, input),
  sandboxGetFile: (ctx, _a, input) => ctx.runAction(internal.node.sandboxGetFile, input),
  sandboxDispose: (ctx, _a, _input) => ctx.runAction(internal.node.sandboxDispose, {}),

  fsWrite: (ctx, _a, input) => ctx.runAction(internal.node.fsWrite, input),
  fsRead: (ctx, _a, input) => ctx.runAction(internal.node.fsRead, input),
  fsList: (ctx, _a, input) => ctx.runAction(internal.node.fsList, input),
  fsPublicUrl: (ctx, _a, input) => ctx.runAction(internal.node.fsPublicUrl, input),

  getBalance: async (_ctx, account) => ({
    accountId: account.accountId,
    creditsCents: account.creditsCents,
    spentCents: account.spentCents,
  }),
  listEvents: async (ctx, account, input) => ({
    events: await ctx.runQuery(api.events.listByAccount, {
      accountId: account.accountId,
      limit: input.limit,
    }),
  }),
};
