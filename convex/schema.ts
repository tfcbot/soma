import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const todoState = v.union(
  v.literal("requested"),
  v.literal("accepted"),
  v.literal("in_production"),
  v.literal("qa"),
  v.literal("delivered"),
  v.literal("approved"),
  v.literal("revise"),
);

export default defineSchema({
  // The persistent TodoStore behind core's TodoPort (SPEC §10, §16).
  todos: defineTable({
    todoId: v.string(),
    title: v.string(),
    brief: v.string(),
    state: todoState,
    channelOrigin: v.optional(v.string()),
    budget: v.optional(
      v.object({ authorized: v.number(), spent: v.number(), currency: v.string() }),
    ),
    artifacts: v.array(v.string()),
    ref: v.optional(v.object({ branch: v.string(), commit: v.string() })),
    history: v.array(v.object({ state: todoState, ts: v.number(), actor: v.string() })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_todoId", ["todoId"]),

  // Per-key accounts (SPEC §7.1). A bearer key resolves to one account with a credit balance.
  // Soma ships NO bypass/admin tier — billing applies uniformly per the pricing table; an
  // operator who wants free access sets per-op cost to 0, mints a large balance, or layers
  // their own permissioning on the reserved `scopes` field.
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

  // Fixed-window rate-limit counters (SPEC §7.5). Abuse protection; off unless the operator
  // sets a limit. One row per (bucket, window).
  rateLimits: defineTable({
    key: v.string(), // `${bucket}:${windowStart}`
    count: v.number(),
    windowStart: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
