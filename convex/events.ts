import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Generic usage/observability ledger (SPEC §7.x). One row per gated call — NOT a workflow.
// Replaces "todo as the unit of observability": billing/attribution/webhooks read from here.
export const record = mutation({
  args: {
    accountId: v.string(),
    op: v.string(),
    costCents: v.number(),
    status: v.string(),
  },
  handler: async (ctx, { accountId, op, costCents, status }) => {
    await ctx.db.insert("events", { accountId, op, costCents, status, ts: Date.now() });
  },
});

export const listByAccount = query({
  args: { accountId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { accountId, limit }) => {
    const rows = await ctx.db
      .query("events")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .order("desc")
      .take(limit ?? 50);
    return rows.map((r) => ({ op: r.op, costCents: r.costCents, status: r.status, ts: r.ts }));
  },
});
