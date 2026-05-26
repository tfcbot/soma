import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Thin DB functions the ConvexTodoStore adapter calls via ctx.runQuery / ctx.runMutation.
// `doc` is the serialized domain Todo (keyed by todoId, no Convex _id leakage upstream).

export const getByTodoId = query({
  args: { todoId: v.string() },
  handler: async (ctx, { todoId }) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_todoId", (q) => q.eq("todoId", todoId))
      .unique();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("todos").collect();
  },
});

export const upsert = mutation({
  args: { doc: v.any() },
  handler: async (ctx, { doc }) => {
    const existing = await ctx.db
      .query("todos")
      .withIndex("by_todoId", (q) => q.eq("todoId", doc.todoId))
      .unique();
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("todos", doc);
    return doc;
  },
});
