# Programmable Assistant (codename: Soma)

A small, open primitive: **a programmable body for an agent's brain.**

Six primitives — **phone, email, wallet, computer, storage, todo** — exposed through one
opinionated API. They give an agent a *complete loop* to pursue a goal on the internet. We
**operate no agents**; we expose the primitives so *someone else's* agent has everything it
needs. We open-source the body; you bring the brain.

We are deliberately **not** integrating with everything. The bet is that these six primitives
are enough to let an agent operate in the world on someone's behalf — and that the constraint
is what makes the thing buildable, ownable, and extensible. More primitives can be added later
the same way (we're a thin wrapper around vendors).

## The one-liner

> Most AI products try to *be* the agent. This one refuses to. It is the body the agent
> borrows — and a service model where the provider runs an **Agent Success Manager** instead
> of a Customer Success Manager.

And the abstraction level-up (SPEC.md §5):

> We move the client up one rung — from owning a **VPS** (a server that degrades the moment you
> stop maintaining it) to owning a **personal API** (a versioned contract their agent calls).
> It's the **Backend-for-Frontend** pattern from web dev, reframed as a **Backend-for-Agent**:
> one tuned contract over six messy vendors. The thing that rots now lives behind the contract,
> on the provider's side — the client never owns the part that degrades.

## The six primitives

| Primitive | What it gives the agent | Reference adapter |
|---|---|---|
| **Phone** | reach / brief by voice, SMS, iMessage | AgentPhone |
| **Email** | correspond, sign up for services, deliver assets | AgentMail |
| **Wallet** | pay — a prepaid virtual card with a hard ceiling | AgentCard |
| **Computer** | run code, unrestricted, sandboxed (`Sandbox` port) | Freestyle VM (ffmpeg, no 5-min cap) |
| **Storage** | hold state + deliverables, serve them (`FileSystem` port) | Archil disk on R2 + CDN |
| **Todo** | track and coordinate the work (`/todo` state machine) | Convex DB |

The first build is a **single-node, personal** deployment (SPEC.md §16). Compute and storage
are split into two planes: a **Sandbox** (Freestyle: compute + git versioned workspace) and a
**FileSystem** (Archil backed by an R2 bucket = durable blobs + a personal CDN).

## Architecture (true hexagonal — ports & adapters)

```
core/        pure hexagon, zero vendor/Convex imports
  ports/       the 6 primitive interfaces
  domain/      todo state machine + budget envelope (+ tests)
  services/    TodoService, Assistant (orchestration), Versioning (+ tests)
adapters/    one folder per vendor: a real adapter + a mock (mocks double as test spies)
convex/      the host
  http.ts      HTTP router + API-key auth (isolate runtime; todo CRUD)
  node.ts      "use node" — vendor-touching ops (deliver, fundCard) run here
  composition.ts  the composition root: real adapter if key present, else mock
  schema.ts / todos.ts / auth.ts / adapters/todoStore.ts
mcp/         dependency-free gateway client for agents
```

Key boundary: vendor SDKs need Node, so vendor calls run in `convex/node.ts`; the isolate-runtime
HTTP layer delegates to them via `ctx.runAction`. Read-only enforcement and scheduling/memory are
deliberately the *client agent's* job, not the body's (SPEC §2, §16).

## Quickstart

```bash
bun install
bun test          # 29 unit tests, vendors mocked — no keys, no network

# Run the backend headlessly with NO Convex login (anonymous local deployment):
CONVEX_AGENT_MODE=anonymous bunx convex dev --once --typecheck enable

# It runs end-to-end on MOCK adapters with zero vendor keys. Set the gateway key and try it:
CONVEX_AGENT_MODE=anonymous bunx convex dev            # keep the local backend running
CONVEX_AGENT_MODE=anonymous bunx convex env set GATEWAY_API_KEY <key>
curl -s -X POST http://127.0.0.1:3211/v1/todo \
  -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \
  -d '{"title":"smoke","brief":"verify it runs"}'
```

Connect real providers one at a time by setting their keys (see `.env.example` and
[GETTING_STARTED.md](./GETTING_STARTED.md)); any primitive without a key uses its mock.

## Docs

- [SPEC.md](./SPEC.md) — the formal protocol: six primitives, body/brain split, the durable-layer
  argument, the VPS→personal-API abstraction, the two-plane compute/storage model, the service
  model + Agent Success Manager, the `/todo` loop, the budget envelope, extensibility, and the
  single-node Convex reference deployment (§16).
- [SCENARIOS.md](./SCENARIOS.md) — concrete walkthrough: a creative agency delivering 10
  ads/month for a Claude-native founder, primitive by primitive, plus adding a `publish` primitive.
- [GETTING_STARTED.md](./GETTING_STARTED.md) — connect providers (or run on mocks), env vars, and
  a worked example.

## Status

Working scaffold; **not yet integration-tested against live vendors.**

- **Built:** hexagonal core; the six primitives; real vendor adapters (AgentMail, AgentPhone,
  AgentCard, Freestyle, Archil-via-R2) coded against the actual SDK/REST contracts; Convex backend.
- **Verified:** `tsc` typecheck clean; **29 unit tests pass** (domain, services, orchestration,
  versioning, mock contracts); the Convex backend **codegens, typechecks, and deploys** to a local
  anonymous deployment; the core gateway path (create / list / advance→409 / no-key→401) is
  **smoke-tested live in mock mode**.
- **Not yet verified:** live vendor round-trips (need real keys); an integration-test layer.
- **Open questions** that gate live use: Freestyle VM pricing/limits, A2P 10DLC registration for
  SMS, AgentCard KYC/spend-controls, R2 bucket + CDN domain setup (SPEC §11 / §15).
