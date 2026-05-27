import { z } from "zod";

// Binary payloads cross the gateway as base64 strings (keeps the contract uniformly JSON).
// Push large artifacts through the filesystem primitive + CDN url rather than streaming bytes.
export const Base64 = z.string().describe("base64-encoded bytes");

export const IssuedCard = z.object({
  id: z.string(),
  pan: z.string(),
  cvv: z.string(),
  expiry: z.string(),
  spendLimitCents: z.number(),
  last4: z.string().optional(),
});

export const EmailAttachment = z.object({
  filename: z.string(),
  url: z.string(),
});

export const ExecResult = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
});

export const WriteResult = z.object({
  path: z.string(),
  url: z.string().optional(),
});

export const Balance = z.object({
  accountId: z.string(),
  creditsCents: z.number(),
  spentCents: z.number(),
});

export const Event = z.object({
  op: z.string(),
  costCents: z.number(),
  status: z.string(),
  ts: z.number(),
});
