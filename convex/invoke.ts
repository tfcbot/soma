"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { buildPorts } from "./ports";

// One action for every vendor-touching op. The gateway passes the op's serve {port, method}, the
// validated input, AND the caller's accountId — needed by stateful adapters (Vercel Sandbox
// resumes the per-account snapshot by name) and ignored by stateless ones.
export const invoke = internalAction({
  args: { port: v.string(), method: v.string(), input: v.any(), accountId: v.string() },
  handler: async (_ctx, { port, method, input, accountId }) => {
    const ports = buildPorts(process.env, accountId) as unknown as Record<
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
