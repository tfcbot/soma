"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { buildPorts } from "./composition";
import { Assistant } from "../core/services/assistant";

// Vendor-touching operations run here, in Convex's Node runtime — the vendor SDKs
// (agentmail, freestyle, @aws-sdk/client-s3) need Node. The HTTP layer (isolate runtime)
// delegates to these via ctx.runAction. Todo-only endpoints don't come through here.

export const deliver = internalAction({
  args: { id: v.string(), sandboxPath: v.string(), filename: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const assistant = new Assistant(buildPorts(ctx));
    return await assistant.deliver(args.id, args.sandboxPath, args.filename, args.to);
  },
});

export const fundCard = internalAction({
  args: {
    id: v.string(),
    amountCents: v.number(),
    memo: v.string(),
    notify: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const assistant = new Assistant(buildPorts(ctx));
    return await assistant.fundCard(args.id, args.amountCents, args.memo, args.notify);
  },
});
