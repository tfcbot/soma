import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { windowStart, retryAfterSeconds, exceeds } from "../core/domain/ratelimit";

// Fixed-window counter. One row per (bucket, window). Atomic read→check→increment.
// Returns whether the call is allowed and, if not, a Retry-After hint (seconds).
export const consume = mutation({
  args: { bucket: v.string(), limit: v.number(), windowMs: v.number() },
  handler: async (ctx, { bucket, limit, windowMs }) => {
    const now = Date.now();
    const ws = windowStart(now, windowMs);
    const key = `${bucket}:${ws}`;
    const row = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    const count = row?.count ?? 0;
    if (exceeds(count, { limit, windowMs })) {
      return { allowed: false, retryAfter: retryAfterSeconds(now, windowMs), limit };
    }
    if (row) await ctx.db.patch(row._id, { count: count + 1, updatedAt: now });
    else await ctx.db.insert("rateLimits", { key, count: 1, windowStart: ws, updatedAt: now });
    return { allowed: true, remaining: limit - (count + 1), limit };
  },
});
