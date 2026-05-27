import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { sha256hex, generateApiKey } from "./keys";

// Self-serve signup, VidJutsu-style: an unauthenticated buyer pays a Stripe Checkout, then claims
// the key the session bought. The DB side lives here (isolate runtime); Stripe calls live in
// convex/payments.ts. mintKey stays operator-only — this is the *paid* path to a first key.

function newAccountId(): string {
  return `acc_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

// Record the claimToken → Checkout session mapping at signup time.
export const storeClaim = mutation({
  args: { claimToken: v.string(), sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, { claimToken, sessionId }) => {
    await ctx.db.insert("claims", { claimToken, sessionId, createdAt: Date.now() });
    return null;
  },
});

// Resolve a claimToken to its session + claimed state (payments.ts checks Stripe with this).
export const resolve = query({
  args: { claimToken: v.string() },
  returns: v.union(
    v.null(),
    v.object({ sessionId: v.string(), accountId: v.optional(v.string()) }),
  ),
  handler: async (ctx, { claimToken }) => {
    const row = await ctx.db
      .query("claims")
      .withIndex("by_claimToken", (q) => q.eq("claimToken", claimToken))
      .unique();
    if (!row) return null;
    return { sessionId: row.sessionId, accountId: row.accountId };
  },
});

// Mint the key for a paid claim, exactly once. Idempotent: if already claimed, returns null so the
// caller reports "already_claimed" (the plaintext key is shown once and cannot be re-issued).
export const fulfill = mutation({
  args: { claimToken: v.string(), creditsCents: v.number(), scopes: v.optional(v.array(v.string())) },
  returns: v.union(
    v.null(),
    v.object({ apiKey: v.string(), accountId: v.string(), creditsCents: v.number() }),
  ),
  handler: async (ctx, { claimToken, creditsCents, scopes }) => {
    const row = await ctx.db
      .query("claims")
      .withIndex("by_claimToken", (q) => q.eq("claimToken", claimToken))
      .unique();
    if (!row || row.accountId) return null; // unknown token, or already claimed

    const apiKey = generateApiKey();
    const apiKeyHash = await sha256hex(apiKey);
    const now = Date.now();
    const accountId = newAccountId();
    await ctx.db.insert("accounts", {
      accountId,
      apiKeyHash,
      creditsCents,
      spentCents: 0,
      label: "self-serve",
      scopes: scopes ?? [],
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(row._id, { accountId, claimedAt: now });
    return { apiKey, accountId, creditsCents };
  },
});
