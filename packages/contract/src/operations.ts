import { z } from "zod";
import {
  Base64,
  IssuedCard,
  EmailAttachment,
  ExecResult,
  WriteResult,
  Balance,
  Event,
} from "./schemas";

export type Method = "GET" | "POST" | "PUT" | "DELETE";

export interface OpDef<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  method: Method;
  path: string;
  /** Where the input is read from. GET ⇒ query (string-coerced); others ⇒ JSON body. */
  inputFrom: "query" | "body";
  input: I;
  output: O;
  /** Credit cost in cents (0 = free). Metered keys are debited this before the work runs. */
  costCents: number;
  summary: string;
}

function op<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(d: OpDef<I, O>): OpDef<I, O> {
  return d;
}

const Empty = z.object({});
const Ok = z.object({ ok: z.boolean() });

// THE SINGLE SOURCE OF TRUTH. Add a faculty/op here, implement one typed handler, done —
// the server router, SDK, CLI, MCP, and OpenAPI all derive from this. Costs live here too.
export const operations = {
  // ── Phone ───────────────────────────────────────────────────────────────
  phoneSendSms: op({
    method: "POST", path: "/v1/phone/messages", inputFrom: "body",
    input: z.object({ to: z.string(), body: z.string() }),
    output: z.object({ id: z.string() }),
    costCents: 5, summary: "Send an SMS",
  }),

  // ── Email ───────────────────────────────────────────────────────────────
  emailSend: op({
    method: "POST", path: "/v1/email/messages", inputFrom: "body",
    input: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
      attachments: z.array(EmailAttachment).optional(),
    }),
    output: z.object({ id: z.string() }),
    costCents: 10, summary: "Send an email",
  }),

  // ── Wallet ──────────────────────────────────────────────────────────────
  walletIssueCard: op({
    method: "POST", path: "/v1/wallet/cards", inputFrom: "body",
    input: z.object({ amountCents: z.number(), memo: z.string() }),
    output: IssuedCard,
    costCents: 50, summary: "Issue a prepaid card",
  }),

  // ── Sandbox (computer) ────────────────────────────────────────────────────
  sandboxExec: op({
    method: "POST", path: "/v1/sandbox/exec", inputFrom: "body",
    input: z.object({ command: z.string() }),
    output: ExecResult,
    costCents: 10, summary: "Run a command in the sandbox VM",
  }),
  sandboxPutFile: op({
    method: "PUT", path: "/v1/sandbox/files", inputFrom: "body",
    input: z.object({ path: z.string(), data: Base64 }),
    output: z.object({ path: z.string() }),
    costCents: 2, summary: "Write a file into the sandbox",
  }),
  sandboxGetFile: op({
    method: "GET", path: "/v1/sandbox/files", inputFrom: "query",
    input: z.object({ path: z.string() }),
    output: z.object({ data: Base64.nullable() }),
    costCents: 1, summary: "Read a file out of the sandbox",
  }),
  sandboxDispose: op({
    method: "POST", path: "/v1/sandbox/dispose", inputFrom: "body",
    input: Empty,
    output: Ok,
    costCents: 0, summary: "Suspend/destroy the sandbox VM",
  }),

  // ── FileSystem (storage) ──────────────────────────────────────────────────
  fsWrite: op({
    method: "PUT", path: "/v1/fs/objects", inputFrom: "body",
    input: z.object({ path: z.string(), data: Base64, public: z.boolean().optional() }),
    output: WriteResult,
    costCents: 2, summary: "Write an object to storage",
  }),
  fsRead: op({
    method: "GET", path: "/v1/fs/objects", inputFrom: "query",
    input: z.object({ path: z.string() }),
    output: z.object({ data: Base64.nullable() }),
    costCents: 1, summary: "Read an object from storage",
  }),
  fsList: op({
    method: "GET", path: "/v1/fs/list", inputFrom: "query",
    input: z.object({ prefix: z.string().optional() }),
    output: z.object({ paths: z.array(z.string()) }),
    costCents: 0, summary: "List object paths",
  }),
  fsPublicUrl: op({
    method: "GET", path: "/v1/fs/public-url", inputFrom: "query",
    input: z.object({ path: z.string() }),
    output: z.object({ url: z.string() }),
    costCents: 0, summary: "Get the public CDN url for a path",
  }),

  // ── Gateway (account-facing, free) ────────────────────────────────────────
  getBalance: op({
    method: "GET", path: "/v1/balance", inputFrom: "query",
    input: Empty,
    output: Balance,
    costCents: 0, summary: "Get the calling key's credit balance",
  }),
  listEvents: op({
    method: "GET", path: "/v1/events", inputFrom: "query",
    input: z.object({ limit: z.coerce.number().optional() }),
    output: z.object({ events: z.array(Event) }),
    costCents: 0, summary: "List the calling key's recent usage events",
  }),
} satisfies Record<string, OpDef<z.ZodTypeAny, z.ZodTypeAny>>;

export type Operations = typeof operations;
export type OperationId = keyof Operations;
export type Input<K extends OperationId> = z.infer<Operations[K]["input"]>;
export type Output<K extends OperationId> = z.infer<Operations[K]["output"]>;
