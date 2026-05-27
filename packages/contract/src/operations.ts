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

// How an operation is served:
//  - a PORT op delegates to a port adapter method (vendor-touching → generic node invoke)
//  - a GATEWAY op runs inline against the account/DB (no vendor; e.g. balance, events)
export type Serve = { port: string; method: string } | { gateway: true };

export interface OpDef<I extends z.ZodTypeAny, O extends z.ZodTypeAny, S extends Serve = Serve> {
  method: Method;
  path: string;
  inputFrom: "query" | "body"; // GET ⇒ query (string-coerced); else JSON body
  input: I;
  output: O;
  costCents: number; // 0 = free; metered keys debited this before the work runs
  summary: string;
  auth?: "key" | "public"; // default "key" — "public" skips auth + metering
  serve: S;
}

// `const S` preserves the literal { port, method } so port adapter types can be derived.
function op<I extends z.ZodTypeAny, O extends z.ZodTypeAny, const S extends Serve>(
  d: OpDef<I, O, S>,
): OpDef<I, O, S> {
  return d;
}

const Empty = z.object({});
const Ok = z.object({ ok: z.boolean() });

// THE SINGLE SOURCE OF TRUTH. Add an op here (with its `serve`) + implement the matching port
// adapter method — done. The router, generic dispatcher, SDK, CLI, MCP, and OpenAPI all derive
// from this. Costs and auth live here too.
export const operations = {
  // ── Phone ───────────────────────────────────────────────────────────────
  phoneSendSms: op({
    method: "POST", path: "/v1/phone/messages", inputFrom: "body",
    input: z.object({ to: z.string(), body: z.string() }),
    output: z.object({ id: z.string() }),
    costCents: 5, summary: "Send an SMS",
    serve: { port: "phone", method: "sendSms" },
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
    serve: { port: "email", method: "send" },
  }),

  // ── Wallet ──────────────────────────────────────────────────────────────
  walletIssueCard: op({
    method: "POST", path: "/v1/wallet/cards", inputFrom: "body",
    input: z.object({ amountCents: z.number(), memo: z.string() }),
    output: IssuedCard,
    costCents: 50, summary: "Issue a prepaid card",
    serve: { port: "wallet", method: "issueCard" },
  }),

  // ── Sandbox (computer) ────────────────────────────────────────────────────
  sandboxExec: op({
    method: "POST", path: "/v1/sandbox/exec", inputFrom: "body",
    input: z.object({ command: z.string() }),
    output: ExecResult,
    costCents: 10, summary: "Run a command in the sandbox VM",
    serve: { port: "sandbox", method: "exec" },
  }),
  sandboxPutFile: op({
    method: "PUT", path: "/v1/sandbox/files", inputFrom: "body",
    input: z.object({ path: z.string(), data: Base64 }),
    output: z.object({ path: z.string() }),
    costCents: 2, summary: "Write a file into the sandbox",
    serve: { port: "sandbox", method: "putFile" },
  }),
  sandboxGetFile: op({
    method: "GET", path: "/v1/sandbox/files", inputFrom: "query",
    input: z.object({ path: z.string() }),
    output: z.object({ data: Base64.nullable() }),
    costCents: 1, summary: "Read a file out of the sandbox",
    serve: { port: "sandbox", method: "getFile" },
  }),
  sandboxDispose: op({
    method: "POST", path: "/v1/sandbox/dispose", inputFrom: "body",
    input: Empty,
    output: Ok,
    costCents: 0, summary: "Suspend/destroy the sandbox VM",
    serve: { port: "sandbox", method: "dispose" },
  }),

  // ── FileSystem (storage) ──────────────────────────────────────────────────
  fsWrite: op({
    method: "PUT", path: "/v1/fs/objects", inputFrom: "body",
    input: z.object({ path: z.string(), data: Base64, public: z.boolean().optional() }),
    output: WriteResult,
    costCents: 2, summary: "Write an object to storage",
    serve: { port: "filesystem", method: "write" },
  }),
  fsRead: op({
    method: "GET", path: "/v1/fs/objects", inputFrom: "query",
    input: z.object({ path: z.string() }),
    output: z.object({ data: Base64.nullable() }),
    costCents: 1, summary: "Read an object from storage",
    serve: { port: "filesystem", method: "read" },
  }),
  fsList: op({
    method: "GET", path: "/v1/fs/list", inputFrom: "query",
    input: z.object({ prefix: z.string().optional() }),
    output: z.object({ paths: z.array(z.string()) }),
    costCents: 0, summary: "List object paths",
    serve: { port: "filesystem", method: "list" },
  }),
  fsPublicUrl: op({
    method: "GET", path: "/v1/fs/public-url", inputFrom: "query",
    input: z.object({ path: z.string() }),
    output: z.object({ url: z.string() }),
    costCents: 0, summary: "Get the public CDN url for a path",
    serve: { port: "filesystem", method: "publicUrl" },
  }),

  // ── Gateway (account-facing, DB-backed, free) ─────────────────────────────
  getBalance: op({
    method: "GET", path: "/v1/balance", inputFrom: "query",
    input: Empty,
    output: Balance,
    costCents: 0, summary: "Get the calling key's credit balance",
    serve: { gateway: true },
  }),
  listEvents: op({
    method: "GET", path: "/v1/events", inputFrom: "query",
    input: z.object({ limit: z.coerce.number().optional() }),
    output: z.object({ events: z.array(Event) }),
    costCents: 0, summary: "List the calling key's recent usage events",
    serve: { gateway: true },
  }),
} satisfies Record<string, OpDef<z.ZodTypeAny, z.ZodTypeAny>>;

export type Operations = typeof operations;
export type OperationId = keyof Operations;
export type Input<K extends OperationId> = z.infer<Operations[K]["input"]>;
export type Output<K extends OperationId> = z.infer<Operations[K]["output"]>;
