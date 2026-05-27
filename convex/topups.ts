import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { grant } from "../core/domain/credits";

// Credit an account for a paid Checkout session, exactly once. Both the Stripe webhook and the
// /v1/topup/confirm poll path call this, so a session is never double-credited. Runnable directly
// (`bunx convex run topups:creditOnce '{...}'`) to test fulfillment without any Stripe setup.
export const creditOnce = mutation({
  args: { sessionId: v.string(), accountId: v.string(), amountCents: v.number() },
  returns: v.object({
    credited: v.boolean(),
    reason: v.optional(v.string()),
    creditsCents: v.optional(v.number()),
  }),
  handler: async (ctx, { sessionId, accountId, amountCents }) => {
    const seen = await ctx.db
      .query("topups")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (seen) return { credited: false, reason: "already_credited" as const };
    const a = await ctx.db
      .query("accounts")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .unique();
    if (!a) return { credited: false, reason: "account_not_found" as const };
    const next = grant({ creditsCents: a.creditsCents, spentCents: a.spentCents }, amountCents);
    await ctx.db.patch(a._id, { ...next, updatedAt: Date.now() });
    await ctx.db.insert("topups", { sessionId, accountId, amountCents, ts: Date.now() });
    return { credited: true, creditsCents: next.creditsCents };
  },
});
