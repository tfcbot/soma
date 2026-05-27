# Workstation

> A workstation for your AI brain. An open, self-hostable template: **clone it, deploy your own, extend it.**

**Five primitives** — **phone, email, wallet, computer, storage** — exposed directly through one
metered **gateway**. They give an agent a *complete loop* to pursue a goal on the internet. We
**operate no agents**; we expose the primitives so *someone else's* agent has everything it needs.
We open-source the workstation; you bring the brain — and the brain coordinates its own work (Workstation is
not a task manager). Run it for your own agent, or operate it for others — the metered gateway works the same.

We are deliberately **not** integrating with everything. The bet is that these five primitives,
behind a keyed/metered/observable gateway, are enough for an agent to operate in the world on
someone's behalf. New primitives are added the same way every endpoint is: a typed contract entry
plus one handler (see [Extending the gateway](#extending-the-gateway-type-safe)).

## The one-liner

> Most AI products try to *be* the agent. This one refuses to. It is the workstation the agent
> borrows — and a service model where the provider runs an **Agent Success Manager** instead
> of a Customer Success Manager.

And the abstraction level-up ([THESIS.md](./THESIS.md)):

> We move the client up one rung — from owning a **VPS** (a server that degrades the moment you
> stop maintaining it) to owning a **personal API** (a versioned contract their agent calls).
> It's the **Backend-for-Frontend** pattern from web dev, reframed as a **Backend-for-Agent**:
> one tuned contract over the messy vendors. The thing that rots now lives behind the contract,
> on the provider's side — the client never owns the part that degrades.

## Five primitives + a gateway

| Primitive | What it gives the agent | Reference adapter |
|---|---|---|
| **Phone** | reach / brief by SMS (voice, iMessage later) | AgentPhone |
| **Email** | correspond, sign up for services, deliver assets | AgentMail |
| **Wallet** | pay — a prepaid virtual card with a hard ceiling | AgentCard |
| **Computer** | run code, unrestricted, sandboxed (`Sandbox` port) | Freestyle VM (ffmpeg, no 5-min cap) |
| **Storage** | hold state + deliverables, serve them (`FileSystem` port) | Archil disk on R2 + CDN |

The **gateway** is the durable spine the agent actually calls: per-key accounts, per-call credit
metering (402), opt-in rate limits (429), and a generic event ledger (observability + webhooks).
Task tracking is **not** a primitive — the agent brain owns it. The first build is a **single-node,
personal** deployment (SPEC.md §12).

## Architecture (true hexagonal — ports & adapters)

```
packages/contract/  the typed operation registry (Zod) — THE single source of truth
core/        pure hexagon: the 5 primitive ports + domain (credits, ratelimit) + tests
adapters/    one folder per primitive: a real adapter + a mock (mocks double as test spies)
packages/contract/  the typed registry (Zod) + the port interfaces — THE single source of truth
core/        pure hexagon: domain (credits, ratelimit) + tests
adapters/    one folder per primitive: a real adapter + a mock, typed straight from the registry
convex/      the host / gateway
  gateway.ts   builds every HTTP route from the registry: auth → 429 → 402 → dispatch → event
  invoke.ts    "use node" — ONE generic dispatcher; calls the right port adapter method
  ports.ts     the port registry (real adapter if keys present, else mock)
  gatewayHandlers.ts  the few DB-backed ops (balance, events)
  accounts.ts / ratelimit.ts / events.ts / auth.ts / http.ts
packages/{sdk,cli,mcp}/  all derived from packages/contract (no codegen — shared types)
```

Key boundary: vendor SDKs need Node, so vendor calls run in `convex/node.ts`; the isolate-runtime
HTTP layer delegates to them via `ctx.runAction`. Read-only enforcement and scheduling/memory are
deliberately the *client agent's* job, not the workstation's (SPEC §9; THESIS).

## Clone & deploy your own

Workstation is a **template you own**, not a SaaS you log into. Use it as a GitHub template (or clone
it), point it at your own infra, swap in the vendors you want, and run your own single-node
deployment of the workstation — your agent, your wallet ceiling, your data. Nothing phones home.

```bash
# 1. Get your own copy — GitHub "Use this template", or:
git clone https://github.com/tfcbot/workstation.git
cd workstation
bun install

# 2. Run it locally on mocks — no vendor keys, no Convex login:
bun test                                    # 29 unit tests, vendors mocked
CONVEX_AGENT_MODE=anonymous bunx convex dev  # local backend on mock adapters

# 3. Make it yours: connect real vendors one at a time (GETTING_STARTED.md),
#    mint a key (bunx convex run accounts:mintKey), then deploy your own Convex backend.
```

What you customize:

- **The five primitives** — each is a port with a real adapter + a mock (`adapters/<primitive>/`).
  Swap a vendor by writing a new adapter against the same port; the contract never changes.
- **The contract** — add or change operations in `packages/contract` (typed Zod registry); the
  server handler, SDK, CLI, MCP, and OpenAPI all derive from it (no codegen — shared types).
- **The deployment** — single-node Convex (SPEC §12). Bring your own keys; you own the deployment.

The CLI installer (`packages/cli/install.sh`) pulls binaries from this repo's GitHub Releases.
If you redistribute your own build, change `REPO=` in that script to your fork.

## Charging for usage (optional)

Workstation is a framework: it ships the *metering*, not a payment processor. Each endpoint has a
credit cost in the contract registry `packages/contract/src/operations.ts` (0 = free). A bearer key is an account with a credit
balance; billable calls debit it, and an empty balance returns `402` with a `topupUrl` and a
`WWW-Authenticate: Payment` header (agent-native — an x402/MPP agent can settle inline).

**Stripe is the shipped reference rail.** Set `STRIPE_SECRET_KEY` and the gateway exposes
`POST /v1/topup` (a Stripe Checkout session — the URL a `402` points at). Paid sessions are
credited **idempotently** (at most once per session) through one vendor-neutral seam, two ways:
a signature-verified `POST /webhooks/stripe` (set `STRIPE_WEBHOOK_SECRET`; for local dev,
`stripe listen --forward-to <deploy>/webhooks/stripe` via the [Stripe CLI](https://docs.stripe.com/stripe-cli)
prints the `whsec_`), or a poll endpoint `POST /v1/topup/confirm {sessionId}` that needs **no
webhook** — so you can test the paid flow before wiring one. Swap rails by replacing
`convex/payments.ts`:

```bash
# the seam every rail calls (also a manual top-up / scheduled grant):
bunx convex run accounts:grantCredits '{"accountId":"acc_…","amountCents":5000}'
```

**Getting the first key.** The operator mints keys directly (`bunx convex run accounts:mintKey …`)
and hands them out. To let clients onboard themselves, the same Stripe rail powers a **public,
key-less signup** (à la VidJutsu): `POST /v1/signup {amountCents}` returns a Checkout `url` + a
`claimToken`; after paying, the buyer polls `POST /v1/signup/claim {claimToken}` and the gateway
mints their key with that starting balance — **exactly once** per token, shown a single time. No
webhook needed (the claim poll is the delivery), so it works the moment `STRIPE_SECRET_KEY` is set.
`mintKey` stays operator-only; signup is the paid path to a first key.

Optional abuse protection: set `WORKSTATION_RATE_LIMIT_PER_MIN` (per account, per operation) for
`429 + Retry-After`. Metering and top-ups are off until you set per-op costs and the Stripe keys.

## Extending the gateway (type-safe)

Adding an endpoint is a spec-first, type-checked edit — no codegen, because in a monorepo the
server and clients share one definition:

1. Add an operation to `packages/contract/src/operations.ts` — path, method, Zod input/output,
   cost, and a `serve` (a port+method for vendor ops, or `{ gateway: true }` for DB ops).
2. For a vendor op, implement that one method on the port adapter (typed straight from the
   registry — a mismatch fails `tsc`); a gateway op gets a small handler in `gatewayHandlers.ts`.
   No per-op router or node action — the generic dispatcher (`convex/invoke.ts`) handles it.
3. Done. The HTTP route (auth + metering + events), the typed SDK method, the MCP tool, the CLI
   command, and the OpenAPI spec all derive from that single entry.

## Customize with an agent

Point your agent at this repo and let it do the setup. Install the bundled skill:

```bash
npx skills add tfcbot/workstation
```

[![skills.sh](https://skills.sh/b/tfcbot/workstation)](https://www.skills.sh)

Then tell your agent "set up my workstation" (or "add a <vendor> primitive", "mint a scoped key",
"launch the backend"). The `customize-workstation` skill walks it through scaffolding capabilities,
wiring vendor env vars, minting scoped keys with credits, and deploying — driving the recipe in
[AGENTS.md](./AGENTS.md).

## Quickstart

```bash
bun install
bun test          # 29 unit tests, vendors mocked — no keys, no network

# Run the backend headlessly with NO Convex login (anonymous local deployment):
CONVEX_AGENT_MODE=anonymous bunx convex dev --once --typecheck enable

# It runs end-to-end on MOCK adapters with zero vendor keys. Mint an admin key and try it:
CONVEX_AGENT_MODE=anonymous bunx convex dev            # keep the local backend running
# Mint a key (operator-owned). Prints the plaintext key once; 0-cost ops work on any balance:
KEY=$(CONVEX_AGENT_MODE=anonymous bunx convex run accounts:mintKey '{"label":"owner"}' | jq -r .apiKey)
# Call a primitive (free op shown; phone/email/wallet/sandbox/fs all work the same way):
curl -s http://127.0.0.1:3211/v1/balance -H "Authorization: Bearer $KEY"
curl -s -X POST http://127.0.0.1:3211/v1/phone/messages \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"to":"+15551230000","body":"hello from the workstation"}'
```

Connect real providers one at a time by setting their keys (see `.env.example` and
[GETTING_STARTED.md](./GETTING_STARTED.md)); any primitive without a key uses its mock.

## Docs

- [SPEC.md](./SPEC.md) — the **normative protocol**, implementable by anyone (OAuth-style):
  roles, conformance, the five primitive interfaces, the Gateway HTTP API + per-key accounts +
  metering (402) + rate limits (429) + the event ledger, security, extensibility, and the
  single-node Convex reference deployment.
- [THESIS.md](./THESIS.md) — the **reasoning and philosophy**: brain/workstation split, dependency
  inversion, why raw-API+skills rots, the deterministic firebreak, cost control, the
  VPS→personal-API ladder, Backend-for-Agent, and the Agent Success Manager.
- [SCENARIOS.md](./SCENARIOS.md) — concrete walkthrough: a creative agency delivering 10
  ads/month for a Claude-native founder, primitive by primitive, plus adding a `publish` primitive.
- [GETTING_STARTED.md](./GETTING_STARTED.md) — connect providers (or run on mocks), env vars, and
  a worked example.

## Status

Working scaffold; **not yet integration-tested against live vendors.**

- **Built:** hexagonal core; the five primitives + gateway; real vendor adapters (AgentMail, AgentPhone,
  AgentCard, Freestyle, Archil-via-R2) coded against the actual SDK/REST contracts; Convex backend.
- **Verified:** `tsc` typecheck clean; **29 unit tests pass** (domain, services, orchestration,
  versioning, mock contracts); the Convex backend **codegens, typechecks, and deploys** to a local
  anonymous deployment; the core gateway path (create / list / advance→409 / no-key→401) is
  **smoke-tested live in mock mode**.
- **Not yet verified:** live vendor round-trips (need real keys); an integration-test layer.
- **Open questions** that gate live use: Freestyle VM pricing/limits, A2P 10DLC registration for
  SMS, AgentCard KYC/spend-controls, R2 bucket + CDN domain setup (THESIS §13).
