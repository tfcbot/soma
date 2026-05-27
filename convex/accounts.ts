import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { sha256hex, generateApiKey } from "./keys";
import { debit as debitBalance, credit as creditBalance } from "../core/domain/credits";

// Per-key accounts — Soma's analog of VidJutsu's machineClients. A bearer key resolves to one
// of these. The single-node OPERATOR mints + distributes keys and owns their permissions.
// Soma defines NO bypass/admin tier: billing applies uniformly (see core/domain/pricing.ts).

function newAccountId(): string {
  return `acc_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/**
 * Mint an API key. Returns the plaintext key ONCE (only its hash is stored).
 * Bootstrap a fresh deployment with:
 *   bunx convex run accounts:mintKey '{"label":"owner","creditsCents":100000}'
 * Zero-cost operations work on any key (even 0 balance); billable ops need credits.
 */
export const mintKey = mutation({
  args: { creditsCents: v.optional(v.number()), label: v.optional(v.string()) },
  handler: async (ctx, { creditsCents, label }) => {
    const apiKey = generateApiKey();
    const apiKeyHash = await sha256hex(apiKey);
    const now = Date.now();
    const accountId = newAccountId();
    await ctx.db.insert("accounts", {
      accountId,
      apiKeyHash,
      creditsCents: creditsCents ?? 0,
      spentCents: 0,
      label: label ?? "",
      scopes: [],
      createdAt: now,
      updatedAt: now,
    });
    return { apiKey, accountId };
  },
});

export const getByApiKeyHash = query({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, { apiKeyHash }) =>
    await ctx.db
      .query("accounts")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", apiKeyHash))
      .unique(),
});

export const getBalance = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const a = await ctx.db
      .query("accounts")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .unique();
    if (!a) return null;
    return { accountId, creditsCents: a.creditsCents, spentCents: a.spentCents };
  },
});

// Atomic debit: read → check (pure domain) → patch, all inside one mutation (no race).
export const debitCredits = mutation({
  args: { accountId: v.string(), amountCents: v.number() },
  handler: async (ctx, { accountId, amountCents }) => {
    const a = await ctx.db
      .query("accounts")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .unique();
    if (!a) throw new Error(`account_not_found:${accountId}`);
    const next = debitBalance({ creditsCents: a.creditsCents, spentCents: a.spentCents }, amountCents);
    await ctx.db.patch(a._id, { ...next, updatedAt: Date.now() });
    return next;
  },
});

// Refund (on vendor-op failure after a debit) and top-up share this credit path.
export const refundCredits = mutation({
  args: { accountId: v.string(), amountCents: v.number() },
  handler: async (ctx, { accountId, amountCents }) => {
    const a = await ctx.db
      .query("accounts")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .unique();
    if (!a) return null;
    const next = creditBalance({ creditsCents: a.creditsCents, spentCents: a.spentCents }, amountCents);
    await ctx.db.patch(a._id, { ...next, updatedAt: Date.now() });
    return next;
  },
});
