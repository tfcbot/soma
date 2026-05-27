"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { buildPorts } from "./ports";

// One action for every vendor-touching op. The gateway passes the op's serve {port, method} and
// the validated input; we resolve the adapter and call it. This replaces the per-op node actions.
export const invoke = internalAction({
  args: { port: v.string(), method: v.string(), input: v.any() },
  handler: async (_ctx, { port, method, input }) => {
    const ports = buildPorts() as unknown as Record<
      string,
      Record<string, (i: unknown) => Promise<unknown>>
    >;
    const adapter = ports[port];
    if (!adapter || typeof adapter[method] !== "function") {
      throw new Error(`unknown port op: ${port}.${method}`);
    }
    return await adapter[method](input); // call on the adapter so `this` is bound
  },
});
