"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { buildPorts } from "./composition";

// Vendor-touching faculty calls run here (Node runtime — vendor SDKs). One action per faculty
// operation; the isolate-runtime handlers (convex/handlers.ts) delegate to these. Binary payloads
// cross as base64 (decoded/encoded at this boundary).

export const phoneSendSms = internalAction({
  args: { to: v.string(), body: v.string() },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, a) => buildPorts(ctx).phone.sendSms(a.to, a.body),
});

export const emailSend = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    attachments: v.optional(v.array(v.object({ filename: v.string(), url: v.string() }))),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, a) =>
    buildPorts(ctx).email.send({
      to: a.to,
      subject: a.subject,
      body: a.body,
      attachments: a.attachments,
    }),
});

export const walletIssueCard = internalAction({
  args: { amountCents: v.number(), memo: v.string() },
  returns: v.object({
    id: v.string(),
    pan: v.string(),
    cvv: v.string(),
    expiry: v.string(),
    spendLimitCents: v.number(),
    last4: v.optional(v.string()),
  }),
  handler: async (ctx, a) => buildPorts(ctx).wallet.issueCard({ amountCents: a.amountCents, memo: a.memo }),
});

export const sandboxExec = internalAction({
  args: { command: v.string() },
  returns: v.object({ stdout: v.string(), stderr: v.string(), exitCode: v.number() }),
  handler: async (ctx, a) => buildPorts(ctx).sandbox.exec(a.command),
});

export const sandboxPutFile = internalAction({
  args: { path: v.string(), data: v.string() },
  returns: v.object({ path: v.string() }),
  handler: async (ctx, a) => {
    await buildPorts(ctx).sandbox.putFile(a.path, Buffer.from(a.data, "base64"));
    return { path: a.path };
  },
});

export const sandboxGetFile = internalAction({
  args: { path: v.string() },
  returns: v.object({ data: v.union(v.string(), v.null()) }),
  handler: async (ctx, a) => {
    const bytes = await buildPorts(ctx).sandbox.getFile(a.path);
    return { data: bytes ? Buffer.from(bytes).toString("base64") : null };
  },
});

export const sandboxDispose = internalAction({
  args: {},
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx) => {
    await buildPorts(ctx).sandbox.dispose();
    return { ok: true };
  },
});

export const fsWrite = internalAction({
  args: { path: v.string(), data: v.string(), public: v.optional(v.boolean()) },
  returns: v.object({ path: v.string(), url: v.optional(v.string()) }),
  handler: async (ctx, a) =>
    buildPorts(ctx).filesystem.write(a.path, Buffer.from(a.data, "base64"), { public: a.public }),
});

export const fsRead = internalAction({
  args: { path: v.string() },
  returns: v.object({ data: v.union(v.string(), v.null()) }),
  handler: async (ctx, a) => {
    const bytes = await buildPorts(ctx).filesystem.read(a.path);
    return { data: bytes ? Buffer.from(bytes).toString("base64") : null };
  },
});

export const fsList = internalAction({
  args: { prefix: v.optional(v.string()) },
  returns: v.object({ paths: v.array(v.string()) }),
  handler: async (ctx, a) => ({ paths: await buildPorts(ctx).filesystem.list(a.prefix) }),
});

export const fsPublicUrl = internalAction({
  args: { path: v.string() },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, a) => ({ url: buildPorts(ctx).filesystem.publicUrl(a.path) }),
});
