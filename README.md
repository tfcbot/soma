# Workstation

**Monetize your AI expertise.** Package the AI stack you've built — vendors, prompts, agent loops —
as a metered **API + CLI + MCP** your clients' agents pay to call. One typed contract, three
surfaces, pay-as-you-go billing built in.

Your clients already have agents. The job isn't to deploy them another one — it's to give their
agent the **semantic layer** it needs to use *your* service, in the way agents already talk: a tool
to call, a command to run, an endpoint to hit. Workstation turns one typed contract into an API, a
CLI, and an MCP server at once, behind a gateway that handles per-key accounts, usage metering, and
self-serve payment. You run it headless; the client's agent calls it and settles the bill.

> Workstation doesn't try to *be* the client's brain — that agent stays theirs. What lives *behind*
> your endpoint is your call: a deterministic pipeline, a single LLM call, or a full agent loop.
> The contract is the interface; the implementation is yours.

## The client experience
1. **Connect to your service.** The client points their agent at it — add your **MCP** server, grab
   the **CLI**, or install a skill you publish. (The MCP server and CLI are generated from your
   contract; the skill is one you author.)
2. **Get a payment link.** A keyless `POST /v1/signup {amountCents}` returns a pay-as-you-go
   Checkout link. The human pays it — or an agent that speaks x402/MPP settles the `402` inline. A
   scoped API key is **minted on payment** (shown once); top-ups work the same way.
3. **Start using it.** Their agent calls your service — over MCP, the CLI, or the API — and every
   call is metered against their balance. Out of credits → `402` with a top-up link.

## One contract → API, CLI, MCP, OpenAPI
Define each operation once in a typed registry (`packages/contract`, Zod). From that single source,
with **no codegen** (a monorepo shares types), you get the HTTP **API** (auth + metering + events), a
typed **SDK**, a **CLI**, an **MCP** server, and a derived **OpenAPI** spec. Add or change an
operation in one place and every surface updates in lockstep (see
[Extending the gateway](#extending-the-gateway-type-safe)). That's how you ship a service to agents
on every channel they speak — in one go.

## What you get: a metered gateway + reference capabilities
**The framework primitives are the gateway concerns** — keys, access control (scopes), per-call
credit metering (402), rate limits (429), event ledger, signup/topup. **Reference capabilities** —
**Compute** (a persistent sandbox) and **Storage** (object store + CDN) — ship as a working
baseline; replace either with your own vendor, or add new capabilities with the one-folder recipe.

| Primitive | What it gives the agent | Reference adapter |
|---|---|---|
| **Computer** | run code, unrestricted, sandboxed (`Sandbox` port) | Vercel Sandbox (persistent microVM, ffmpeg) |

The **gateway** is the durable spine the agent actually calls: per-key accounts, per-call credit
metering (402), opt-in rate limits (429), scoped keys (403), and a generic event ledger
(observability + webhooks). Task tracking is **not** a primitive —
the agent brain owns it. The
first build is a **single-node** deployment (SPEC.md §11).

## Architecture (true hexagonal — ports & adapters)

```
packages/contract/  the typed operation registry (Zod) + port interfaces — THE single source of truth
core/        pure domain: credits + rate-limit math (+ their tests). No vendor code.
modules/     one folder per capability — operations + a real adapter + a mock + server wiring
             (sandbox, filesystem; account = gateway-only ops)
convex/      the host / gateway
  gateway.ts          builds every route from the registry: auth → 403 → 429 → 402 → dispatch → event
  invoke.ts           "use node" — ONE generic dispatcher; calls the right module adapter method
  ports.ts            the port registry (real adapter if keys present, else mock)
  gatewayHandlers.ts  the DB-backed ops (balance, events, top-up, signup/claim)
  payments.ts         "use node" — Stripe reference rail (top-ups + self-serve signup)
  accounts.ts / claims.ts / topups.ts / events.ts / ratelimit.ts / auth.ts / http.ts
packages/{sdk,cli,mcp}/  all derived from packages/contract (no codegen — shared types)
apps/web/    Next.js front door — landing + /success + /cancel; deploys to Vercel
docs/        Mintlify scaffold — guides + API Reference auto-rendered from the contract
vercel.json  Vercel build config (points at apps/web)
```

Key boundary: vendor SDKs need Node, so vendor calls run in a `"use node"` runtime — the generic
dispatcher `convex/invoke.ts` (and the Stripe rail `convex/payments.ts`); the isolate-runtime HTTP
layer delegates to them via `ctx.runAction`. Read-only enforcement and scheduling/memory are
deliberately the *client agent's* job, not the workstation's (SPEC §9; THESIS).

## Clone & deploy your own

Workstation is a **template you own**, not a SaaS you log into. Use it as a GitHub template (or clone
it), point it at your own infra, swap in the vendors you want, and run your own single-node
deployment of the workstation — your agent, your pricing, your data. Nothing phones home.

```bash
# 1. Get your own copy — GitHub "Use this template", or:
git clone https://github.com/tfcbot/workstation.git
cd workstation
bun install

# 2. Run it locally on mocks — no vendor keys, no Convex login:
bun test                                    # 11 unit tests, vendors mocked
CONVEX_AGENT_MODE=anonymous bunx convex dev  # local backend on mock adapters

# 3. Make it yours: connect real vendors (GETTING_STARTED.md), mint a key
#    (bunx convex run accounts:mintKey), and ship the full front door:
#      - Convex backend       (bunx convex deploy)
#      - apps/web landing     (bunx vercel --prod  → set WORKSTATION_BASE_URL)
#      - docs/ on Mintlify    (point the Mintlify GitHub app at docs/)
#    The 6-step walkthrough lives in skills/customize-workstation.
```

What you customize:

- **The reference capabilities** — each is a capability folder with a real adapter + a mock
  (`modules/<name>/`). Swap a vendor by writing a new adapter against the same port; add new
  capabilities the same way. The contract never changes.
- **The front door** — `apps/web/` (landing + `/success` + `/cancel`) and `docs/` (Mintlify) ship as
  empty-shell scaffolds the operator brands. The docs auto-render the API Reference from the same
  contract the gateway serves — `bun run generate` writes the spec to both `spec/openapi/` and
  `docs/openapi/` in one pass.
- **The contract** — add or change operations in `packages/contract` (typed Zod registry); the
  server handler, SDK, CLI, MCP, and OpenAPI all derive from it (no codegen — shared types).
- **The deployment** — single-node Convex (SPEC §11). Bring your own keys; you own the deployment.

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
bun test          # 11 unit tests, vendors mocked — no keys, no network

# Run the backend headlessly with NO Convex login (anonymous local deployment):
CONVEX_AGENT_MODE=anonymous bunx convex dev --once --typecheck enable

# It runs end-to-end on MOCK adapters with zero vendor keys. Mint an admin key and try it:
CONVEX_AGENT_MODE=anonymous bunx convex dev            # keep the local backend running
# Mint a key (operator-owned). Prints the plaintext key once; 0-cost ops work on any balance:
KEY=$(CONVEX_AGENT_MODE=anonymous bunx convex run accounts:mintKey '{"label":"owner"}' | jq -r .apiKey)
# Free op — check the balance:
curl -s http://127.0.0.1:3211/v1/balance -H "Authorization: Bearer $KEY"
# Metered op — run a command in the sandbox (mock returns a fake result):
curl -s -X POST http://127.0.0.1:3211/v1/sandbox/exec \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"command":"echo hello from the workstation"}'
```

Connect real providers one at a time by setting their keys (see `.env.example` and
[GETTING_STARTED.md](./GETTING_STARTED.md)); any capability without a key uses its mock.

## Docs

- [SPEC.md](./SPEC.md) — the **normative protocol**, implementable by anyone (OAuth-style):
  roles, conformance, the reference capability interfaces, the Gateway HTTP API + per-key accounts +
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

Working scaffold; **not yet integration-tested against live vendors or live Stripe.**

- **Built:** hexagonal core; metered gateway (keys, scopes, credits, rate limits, events,
  signup/topup); reference capabilities (Vercel Sandbox + Cloudflare R2) coded against the actual
  SDK/REST contracts; Convex backend; the Stripe reference rail (inbound only — credits, top-ups,
  public self-serve signup), behind one swappable seam.
- **Verified:** `tsc` typecheck clean; **11 unit tests pass** (credits, rate-limit, mock contracts);
  the Convex backend **codegens, typechecks, and deploys** to a local anonymous deployment; the
  gateway is **smoke-tested live over HTTP in mock mode** (keyed call → 200, no-key on a metered op
  → 401, public op keyless → 200, bad body → 400); payment/signup **fulfillment idempotency is
  verified via the DB seam** (credit-once / mint-once) with no Stripe.
- **Not yet verified:** live vendor round-trips and the live Stripe checkout round-trip (need real
  keys — see the skill's Phase 3); an integration-test layer.
- **Open questions** that gate live use: A2P 10DLC registration for SMS, R2 bucket + CDN domain
  setup (THESIS §13).
