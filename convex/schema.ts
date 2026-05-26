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
});
