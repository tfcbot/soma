# The Programmable Assistant Protocol

> Working codename: **Soma**. Version: 0.1 (draft).

This document specifies the protocol normatively — enough to implement it in any language or
stack, the way an OAuth or webhook spec does. The reasoning behind every choice lives in
[THESIS.md](./THESIS.md); a worked example in [SCENARIOS.md](./SCENARIOS.md).

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are used as in
RFC 2119.

---

## 1. Abstract

The Programmable Assistant ("the Assistant", or "the body") is a headless backend that exposes
a fixed set of **primitives** — phone, email, wallet, sandbox, filesystem, and todo — through
one opinionated, API-key-gated HTTP contract. An external **Agent** (the brain, brought by the
caller) drives the primitives to accomplish work. The platform operates no agents; it serves the
contract. A conforming implementation lets any agent be briefed, do work in a sandbox, pay for
tooling, persist deliverables, and report status — a complete loop — without the caller's own
credentials.

## 2. Roles

- **Principal** — the human customer. Owns their Agent and their data.
- **Agent** — the LLM/automation that calls the contract (the "client" in the protocol sense).
  Out of scope to specify; brought by the Principal or Provider.
- **Provider** — operates a deployment of the Assistant. In self-host mode the Principal is the
  Provider.
- **Assistant / Platform** — the conforming backend specified here. It MUST operate no agents.

## 3. Conformance

An implementation conforms to this protocol if and only if it:

1. implements the six primitive interfaces in §5 (an implementation MAY add more, §10);
2. enforces the Todo resource model and lifecycle state machine in §6, rejecting illegal
   transitions;
3. exposes the Gateway HTTP API in §7 with the authentication in §7.1;
4. enforces budget ceilings deterministically as in §8;
5. honors the security requirements in §9 — in particular, it MUST NOT expose secrets as a
   primitive.

Vendor choices (§11) are **informative**: any adapter satisfying a primitive's interface
conforms.

## 4. Architecture

The Agent calls **one** HTTP contract. Behind it, each primitive is a **port** with a swappable
**adapter**. Business-critical logic (the Todo state machine, budget ceilings) MUST live in a
**deterministic** layer, not inside any agent.

```
   Agent (brain, external) ──HTTP──► Gateway (auth + routing)
                                        │
            ┌───────────┬───────────┬───┴────┬────────────┬──────────┐
          Phone       Email       Wallet   Sandbox     FileSystem    Todo
          (port)      (port)      (port)   (port)      (port)        (state)
            │           │           │        │            │
         adapter     adapter     adapter  adapter      adapter   (deterministic core)
```

The Agent MUST NOT be required to address adapters directly; it interacts only with the
Gateway contract.

## 5. Primitives

Each primitive is defined by an interface (shown in language-neutral form; `bytes` = binary
blob, `?` = optional/nullable). A conforming implementation MUST provide an adapter for each.

### 5.1 Phone
```
sendSms(to: string, body: string) -> { id: string }
```

### 5.2 Email
```
send({ to: string, subject: string, body: string,
       attachments?: [{ filename: string, url: string }] }) -> { id: string }
```
Attachments are passed by URL (typically a FileSystem public URL, §5.5).

### 5.3 Wallet
```
issueCard({ amountCents: int, memo: string })
  -> { id, pan, cvv, expiry, spendLimitCents, last4? }
```
The wallet **issues a prepaid card**; it does not "charge". `spendLimitCents` is the prepaid
ceiling. `pan`/`cvv` are sensitive (§9).

### 5.4 Sandbox (compute)
```
exec(command: string) -> { stdout: string, stderr: string, exitCode: int }
putFile(path: string, data: bytes|string) -> void
getFile(path: string) -> bytes?
dispose() -> void
```
A conforming Sandbox MUST run unrestricted code in isolation from the Principal's accounts
(§9). It SHOULD provide a full POSIX environment (so tools like ffmpeg and git run). Versioning
is a convention over `exec` (git in the sandbox); it is not a separate primitive.

### 5.5 FileSystem (storage)
```
read(path: string) -> bytes?
write(path: string, data: bytes|string, opts?: { public?: bool }) -> { path, url? }
list(prefix?: string) -> string[]
publicUrl(path: string) -> string
```
When `opts.public` is set, `write` MUST return a `url` that resolves the object publicly (the
CDN URL). `publicUrl` MUST be deterministic for a given path.

### 5.6 Todo (work state)
Not an external vendor — the deterministic coordination primitive. Defined by the resource and
lifecycle in §6, exposed via the API in §7.

## 6. The Todo resource and lifecycle

### 6.1 Resource
```
Todo {
  id: string                 // server-assigned, e.g. "td_<hex>"
  title: string
  brief: string
  state: TodoState           // see §6.2
  channelOrigin?: string     // "sms" | "email" | "api" | ...
  budget?: { authorized: number, spent: number, currency: string }
  artifacts: string[]        // pointers/URLs; populated at `delivered`
  ref?: { branch: string, commit: string }
  history: [{ state: TodoState, ts: number, actor: string }]
  createdAt: number
  updatedAt: number
}
```

### 6.2 Lifecycle (normative state machine)
```
requested ─► accepted ─► in_production ─► qa ─► delivered ─► approved
                              ▲            │         │
                              └────────────┘         └─► revise ─► in_production
```
Legal transitions:
```
requested      → accepted
accepted       → in_production
in_production  → qa
qa             → delivered | in_production
delivered      → approved | revise
revise         → in_production
approved       → (terminal)
```
An implementation **MUST** reject any transition not listed (respond `409`, §7) and **MUST**
append every accepted transition to `history` with a timestamp and actor.

## 7. Gateway HTTP API

All paths are relative to the deployment base URL. Bodies are JSON.

| Method & path | Purpose | Success | Errors |
|---|---|---|---|
| `POST /v1/todo` | Intake — create a Todo in `requested` | `201` Todo | `400`, `401` |
| `GET /v1/todo` | List all Todos | `200` Todo[] | `401` |
| `GET /v1/todo/{id}` | Fetch one | `200` Todo | `401`, `404` |
| `POST /v1/todo/{id}/comment` | Append a revise note (bounces `delivered`→`revise`) | `200` Todo | `400`, `401` |
| `POST /v1/todo/{id}/advance` | Drive a state transition `{ to }` | `200` Todo | `400`, `401`, `409` |
| `POST /v1/todo/{id}/deliver` | Persist a sandbox artifact + deliver `{ sandboxPath, filename, recipient }` | `200` Todo | `400`, `401`, `409` |
| `POST /v1/todo/{id}/fund` | Issue a card within budget `{ amountCents, memo, recipient? }` | `200` `{ todo, card }` | `400`, `401`, `409` |

`POST /v1/todo` accepts `{ title, brief, channelOrigin?, budget? }`. Illegal state transitions
(including via `deliver`) MUST return `409`; budget overruns (via `fund`) MUST return `409`
(§8).

### 7.1 Authentication
Every request MUST carry `Authorization: Bearer <key>`. Each key resolves to an **account**;
requests without a key that resolves MUST receive `401`. The Provider (the single-node operator)
mints and distributes keys and owns their permissions. Each account has a **credit balance**;
billable calls debit it and an empty balance MUST return `402` (§7.4). There is no single shared
gateway key, and the protocol defines **no bypass/admin tier** — billing applies uniformly. An
operator who wants free or privileged access does so by their own means (e.g. zero per-op cost, a
large balance, or logic layered on the reserved per-account `scopes` field); that is out of scope
for the protocol.

### 7.2 Access boundary
Principal-facing access is limited to reads (`GET`) plus the two writes `POST /v1/todo`
(intake) and `POST /v1/todo/{id}/comment`. State transitions, delivery, and funding are
Provider-side operations. Implementations SHOULD enforce this boundary (in single-node it is by
convention; multi-tenant deployments MUST enforce it per-identity).

### 7.3 Events
Implementations SHOULD emit an event on each state change and MAY fan it out to the Principal's
channels (e.g. webhook → email/SMS on `delivered`). Pull (`GET`) and push (event) are the only
interaction patterns.

### 7.4 Payment (metering)
Each operation has a credit cost (0 = free; costs live in one table, `core/domain/pricing.ts`).
The gateway MUST debit the cost atomically before performing the work and MUST refund it if a
vendor-touching step fails. When the balance cannot cover the cost the gateway MUST return
`402 Payment Required` with an RFC 7807 `application/problem+json` body carrying `required`,
`balance`, and a `topupUrl`, and SHOULD include a `WWW-Authenticate: Payment` header so a
payment-capable agent (e.g. MPP / x402) can settle inline. Metering applies to every account
uniformly (no bypass tier). This is distinct from the budget envelope (§8), which caps the
*agent's* vendor spend, not the *caller's* spend with the Provider.

Credits are *added* to a balance through one server-side seam (`accounts:grantCredits`); the
protocol defines the seam, **not** the purchase rail. How credits are bought — Stripe checkout,
agent-native x402 / MPP settlement, a subscription-style monthly grant, or a manual top-up — is
the Provider's choice and out of scope here. A conforming implementation MUST expose a way to
add credits to an account and MUST NOT make that path reachable by the spending caller itself.

### 7.5 Rate limiting (abuse protection)
Independently of credits, a Provider MAY rate-limit calls to protect against abuse. The
reference implementation ships a fixed-window framework (per `(account, operation)` per
minute) that is **off by default** and enabled by the operator (`SOMA_RATE_LIMIT_PER_MIN`).
When a caller exceeds the limit the gateway MUST return `429 Too Many Requests` with a
`Retry-After` header. Rate limiting is checked **before** metering, so a throttled call does
not consume credits. Limits and policy are the operator's to define; the protocol mandates
only the `429 + Retry-After` shape when limiting is in effect.

## 8. Budget envelope

If a Todo has a `budget`, funding operations MUST be bounded by it:

- The remaining budget is `authorized - spent`.
- A `fund`/charge whose amount exceeds the remaining budget **MUST be refused before any card is
  issued** (no side effect), surfaced as `409`.
- An accepted charge MUST increase `spent` atomically with issuing the card.
- The wallet is prepaid: the issued card's `spendLimitCents` is itself a hard ceiling.

Budgets and currency units are implementation-defined but MUST be enforced deterministically in
code, never delegated to the Agent.

## 9. Security considerations

- **Secrets are never a primitive.** Vendor credentials MUST be held server-side and MUST NOT
  be exposed through any primitive or endpoint. The Agent borrows capabilities (send, pay,
  compute, store), never the underlying keys.
- **Sandbox isolation.** Unrestricted execution MUST be isolated from the Principal's real
  accounts; the only spending channel is the prepaid wallet (§8).
- **Prepaid ceiling.** Autonomous spend MUST be bounded by a prepaid limit; implementations
  SHOULD additionally gate charges behind explicit Principal authorization until trusted.
- **Sensitive fields.** `pan`/`cvv` (§5.3) MUST NOT be logged.
- **Scheduling and memory are out of scope.** They belong to the Agent (the brain), not the
  body; an implementation MUST NOT need them to conform.

## 10. Extensibility

The six primitives are the starting set, not the ceiling. New primitives (e.g. `publish`,
`analytics`) MUST be **additive** — defined as a new port + adapter and, if Agent-facing, a new
endpoint — without changing existing primitive interfaces or the Todo lifecycle. Breaking
changes to a primitive interface or to §6/§7 require a protocol version bump.

## 11. Reference adapters (informative)

These satisfy the interfaces above; any equivalent adapter conforms.

| Primitive | Reference adapter | Alternatives |
|---|---|---|
| Phone | AgentPhone | Twilio |
| Email | AgentMail | Postmark, SendGrid |
| Wallet | AgentCard | Stripe Issuing, Lithic |
| Sandbox | Freestyle (VM + git) | E2B, Modal, Vercel Sandbox (via ComputeSDK) |
| FileSystem | Archil disk on R2 (+ CDN) | S3, GCS, R2 directly |
| Todo / host | Convex (DB + HTTP actions) | any DB + HTTP server |

## 12. Reference deployment (informative)

The included implementation is **single-node, personal** (one Principal, no tenant model),
hosted on Convex:

- Convex is the **composition root + host**, not a primitive. HTTP actions front the contract;
  per-key **accounts** gate them (admin = unmetered, metered = credit-gated); the operator mints keys via `accounts:mintKey`.
- Vendor keys live in Convex environment variables, read server-side.
- Vendor SDKs require Node, so vendor-touching operations run in a Convex `"use node"` action;
  Todo CRUD runs in the isolate runtime and delegates to it.
- Compute = Freestyle (Sandbox); storage = Archil disk backed by an R2 bucket (FileSystem +
  personal CDN). Convex's scheduler/vector/functions are deliberately **not** exposed as
  primitives (§9).

See [GETTING_STARTED.md](./GETTING_STARTED.md) to run it (including headless, no-login operation
via `CONVEX_AGENT_MODE=anonymous`).

---

## Glossary

- **Assistant / body** — the conforming backend; the primitives, headless.
- **Agent / brain** — the external caller; bring your own.
- **Principal** — the customer.
- **Provider** — operator of a deployment (the Principal, when self-hosting).
- **Primitive / port** — one of the six interfaces (§5), extensible (§10).
- **Adapter** — a concrete implementation of a primitive (§11).
- **Todo** — the deterministic work-state resource and lifecycle (§6).
