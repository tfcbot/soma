import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Per-key accounts (SPEC §7.1). A bearer key resolves to one account with a credit balance.
  accounts: defineTable({
    accountId: v.string(),
    apiKeyHash: v.string(), // SHA-256 of the key; plaintext never stored
    creditsCents: v.number(),
    spentCents: v.number(),
    label: v.string(),
    scopes: v.array(v.string()), // reserved for operator-defined permissions; Soma does not act on it
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_apiKeyHash", ["apiKeyHash"])
    .index("by_accountId", ["accountId"]),

  // Fixed-window rate-limit counters (SPEC §7.x). Off unless SOMA_RATE_LIMIT_PER_MIN is set.
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Generic usage/observability ledger — one row per gated primitive call.
  events: defineTable({
    accountId: v.string(),
    op: v.string(),
    costCents: v.number(),
    status: v.string(),
    ts: v.number(),
  }).index("by_accountId", ["accountId"]),
});
